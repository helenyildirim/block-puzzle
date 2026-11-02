// Oyun alanı: tahta + alttaki 3 parçalık tepsi + sürükle-bırak.
//
// Sürükleme akışı:
//  1. Tepsideki bir parçaya dokunulunca parça büyüyerek parmağın biraz üstüne "kalkar".
//  2. Parmak hareket ettikçe en yakın GEÇERLİ hücreye yapışılır, gölge (ghost) gösterilir,
//     patlayacak satır/sütunlar parlar.
//  3. Parmak kalkınca: geçerli yerdeyse parça yerleşir (onPlace), değilse tepsiye geri süzülür.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, View } from 'react-native';
import { useAnimatedValue } from '../useAnimatedValue';
import { BOARD_BORDER, BOARD_PADDING, CELL_GAP } from '../theme';
import { GameState, Piece, canPlace, previewClears } from '../game/engine';
import { ShapeDef, getShape } from '../game/pieces';
import { BoardView, BurstEffect, FlashEffect, Ghost, boardOuterSize } from './Board';
import { PieceView } from './Block';
import { haptic, sfx } from '../feedback';

/** Tepsideki parçaların tahtadaki boyutuna oranı */
export const TRAY_SCALE = 0.55;
/** Sürüklerken parçanın alt kenarı ile parmak arasındaki boşluk (px) */
const FINGER_GAP = 30;
/** Yapışma toleransı (hücre cinsinden): en yakın geçerli hücre bundan uzaksa gölge çıkmaz */
const SNAP_MAX = 1.0;

type Rect = { x: number; y: number; w: number; h: number };
type DragInfo = { slot: number; shape: ShapeDef; color: number; pw: number; ph: number };
type Session = {
  info: DragInfo;
  area: Rect;
  board: Rect;
  slotC: { x: number; y: number };
  fx: number;
  fy: number;
  hover: { r: number; c: number } | null;
};

export function trayHeight(cell: number): number {
  return 5 * (cell + CELL_GAP) * TRAY_SCALE + 8;
}

function measure(node: View | null): Promise<Rect> {
  return new Promise((resolve) => {
    if (!node) {
      resolve({ x: 0, y: 0, w: 0, h: 0 });
      return;
    }
    node.measure((_x, _y, w, h, pageX, pageY) => resolve({ x: pageX, y: pageY, w, h }));
  });
}

type Props = {
  state: GameState;
  cell: number;
  /** Tepsideki her parça şu an tahtaya sığıyor mu? */
  fits: boolean[];
  /** false iken parçalar sürüklenemez (duraklatma, oyun sonu) */
  enabled: boolean;
  effects: BurstEffect[];
  flashes: FlashEffect[];
  /** Tahtanın ortasında gösterilecek puan/combo yazıları */
  popups: React.ReactNode;
  onPlace: (slot: number, r: number, c: number) => void;
};

export function PlayArea({ state, cell, fits, enabled, effects, flashes, popups, onPlace }: Props) {
  const boardSize = boardOuterSize(cell);
  const slotW = boardSize / 3;
  const slotH = trayHeight(cell);

  const areaRef = useRef<View>(null);
  const boardRef = useRef<View>(null);
  const slotRefs = useRef<(View | null)[]>([null, null, null]);

  const [drag, setDrag] = useState<DragInfo | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);

  // Sürükleme işleyicileri her zaman en güncel değerleri okusun
  const latest = useRef({ state, cell, enabled, onPlace });
  useEffect(() => {
    latest.current = { state, cell, enabled, onPlace };
  });

  const posX = useAnimatedValue(0);
  const posY = useAnimatedValue(0);
  const grab = useAnimatedValue(0);

  const api = useMemo(() => {
    const pointer = { x: 0, y: 0 };
    // Değişken durum bir nesnede tutulur (async işleyicilerde yeniden atama yerine alan güncellenir)
    const ctl = { token: 0, activeToken: 0, session: null as Session | null, grabNow: 0 };

    /** Kalkış ilerlemesine (0..1) göre parçayı tepsi yuvasından parmağın üstüne taşır. */
    const updateOverlay = () => {
      const s = ctl.session;
      if (!s) return;
      const tx = s.fx;
      const ty = s.fy - FINGER_GAP - s.info.ph / 2;
      posX.setValue(s.slotC.x + ctl.grabNow * (tx - s.slotC.x));
      posY.setValue(s.slotC.y + ctl.grabNow * (ty - s.slotC.y));
    };

    const computeHover = () => {
      const s = ctl.session;
      if (!s) return;
      const L = latest.current;
      const pitchNow = L.cell + CELL_GAP;
      const cx = s.fx;
      const cy = s.fy - FINGER_GAP - s.info.ph / 2;
      const left = cx - s.info.pw / 2 - (s.board.x - s.area.x) - BOARD_BORDER - BOARD_PADDING;
      const top = cy - s.info.ph / 2 - (s.board.y - s.area.y) - BOARD_BORDER - BOARD_PADDING;
      const fc = left / pitchNow;
      const fr = top / pitchNow;
      let best: { r: number; c: number } | null = null;
      let bestD = Infinity;
      for (const r of [Math.floor(fr), Math.ceil(fr)]) {
        for (const c of [Math.floor(fc), Math.ceil(fc)]) {
          if (!canPlace(L.state.board, s.info.shape, r, c)) continue;
          const d = Math.hypot(r - fr, c - fc);
          if (d < bestD) {
            bestD = d;
            best = { r, c };
          }
        }
      }
      if (best && bestD > SNAP_MAX) best = null;
      const prev = s.hover;
      if ((prev?.r ?? -1) === (best?.r ?? -1) && (prev?.c ?? -1) === (best?.c ?? -1)) return;
      s.hover = best;
      if (!best) {
        setGhost(null);
        return;
      }
      const at = best;
      const { rows, cols } = previewClears(L.state.board, s.info.shape, at.r, at.c);
      setGhost({
        cells: s.info.shape.cells.map(([dr, dc]) => [at.r + dr, at.c + dc] as [number, number]),
        color: s.info.color,
        rows,
        cols,
      });
    };

    const begin = async (slot: number, px: number, py: number) => {
      const L = latest.current;
      const piece: Piece | null = L.state.tray[slot];
      if (!L.enabled || !piece) return;
      if (ctl.session) {
        // Önceki (geri süzülen) parçayı hemen kapat
        grab.stopAnimation();
        ctl.session = null;
        setDrag(null);
        setGhost(null);
      }
      const mine = ++ctl.token;
      ctl.activeToken = mine;
      pointer.x = px;
      pointer.y = py;
      const shape = getShape(piece.shapeId);
      const [area, board, slotRect] = await Promise.all([
        measure(areaRef.current),
        measure(boardRef.current),
        measure(slotRefs.current[slot]),
      ]);
      if (ctl.activeToken !== mine) return; // parmak bu arada kalktı
      const pitchNow = latest.current.cell + CELL_GAP;
      const info: DragInfo = {
        slot,
        shape,
        color: piece.color,
        pw: shape.w * pitchNow - CELL_GAP,
        ph: shape.h * pitchNow - CELL_GAP,
      };
      ctl.session = {
        info,
        area,
        board,
        slotC: { x: slotRect.x - area.x + slotRect.w / 2, y: slotRect.y - area.y + slotRect.h / 2 },
        fx: pointer.x - area.x,
        fy: pointer.y - area.y,
        hover: null,
      };
      ctl.grabNow = 0;
      grab.setValue(0);
      setDrag(info);
      updateOverlay();
      computeHover();
      Animated.timing(grab, {
        toValue: 1,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
      haptic('light');
    };

    const move = (mx: number, my: number) => {
      pointer.x = mx;
      pointer.y = my;
      const s = ctl.session;
      if (!s) return;
      s.fx = mx - s.area.x;
      s.fy = my - s.area.y;
      updateOverlay();
      computeHover();
    };

    const end = (released: boolean) => {
      ctl.activeToken = 0;
      const s = ctl.session;
      if (!s) return;
      if (released && s.hover) {
        const { r, c } = s.hover;
        const slot = s.info.slot;
        grab.stopAnimation();
        ctl.session = null;
        setDrag(null);
        setGhost(null);
        latest.current.onPlace(slot, r, c);
        return;
      }
      // Geçersiz bırakma: parça tepsiye geri süzülür
      if (released) {
        const pitchNow = latest.current.cell + CELL_GAP;
        const cx = s.fx - (s.board.x - s.area.x);
        const cy = s.fy - FINGER_GAP - s.info.ph / 2 - (s.board.y - s.area.y);
        const inside = cx > -pitchNow && cx < s.board.w + pitchNow && cy > -pitchNow && cy < s.board.h + pitchNow;
        if (inside) sfx('invalid');
      }
      grab.stopAnimation();
      s.hover = null;
      setGhost(null);
      Animated.timing(grab, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        if (ctl.session === s) {
          ctl.session = null;
          setDrag(null);
        }
      });
    };

    const setGrab = (v: number) => {
      ctl.grabNow = v;
      updateOverlay();
    };

    return { begin, move, end, setGrab };
  }, [posX, posY, grab]);

  useEffect(() => {
    const id = grab.addListener(({ value }) => api.setGrab(value));
    return () => grab.removeListener(id);
  }, [grab, api]);

  // Duraklatma / oyun sonu gibi durumlarda sürüklemeyi iptal et
  useEffect(() => {
    if (!enabled) api.end(false);
  }, [enabled, api]);

  // Bu işleyiciler dokunma olaylarında çalışır, render sırasında değil; ref okumaları güvenlidir.
  /* eslint-disable react-hooks/refs */
  const responders = useMemo(
    () =>
      [0, 1, 2].map((slot) =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => latest.current.enabled && !!latest.current.state.tray[slot],
          onMoveShouldSetPanResponder: () => false,
          onPanResponderTerminationRequest: () => false,
          onPanResponderGrant: (e) => {
            void api.begin(slot, e.nativeEvent.pageX, e.nativeEvent.pageY);
          },
          onPanResponderMove: (_e, g) => api.move(g.moveX, g.moveY),
          onPanResponderRelease: () => api.end(true),
          onPanResponderTerminate: () => api.end(false),
        }),
      ),
    [api],
  );
  /* eslint-enable react-hooks/refs */

  const overlayScale = useMemo(() => grab.interpolate({ inputRange: [0, 1], outputRange: [TRAY_SCALE, 1] }), [grab]);

  return (
    <View ref={areaRef} collapsable={false} style={{ alignItems: 'center' }}>
      <View>
        <BoardView ref={boardRef} board={state.board} cell={cell} ghost={ghost} effects={effects} flashes={flashes} />
        <View
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            left: 0,
            right: 0,
            top: 0,
            height: boardSize,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {popups}
        </View>
      </View>

      <View style={{ flexDirection: 'row', width: boardSize, marginTop: 18 }}>
        {[0, 1, 2].map((i) => {
          const piece = state.tray[i];
          return (
            <View
              key={i}
              ref={(n) => {
                slotRefs.current[i] = n;
              }}
              collapsable={false}
              {...responders[i].panHandlers}
              style={{ width: slotW, height: slotH }}
            >
              {piece && (
                <TrayPiece
                  key={`${state.trays}-${i}`}
                  piece={piece}
                  index={i}
                  cell={cell}
                  slotW={slotW}
                  slotH={slotH}
                  dim={!fits[i]}
                  hidden={drag?.slot === i}
                />
              )}
            </View>
          );
        })}
      </View>

      {drag && (
        <Animated.View
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            left: 0,
            top: 0,
            width: drag.pw,
            height: drag.ph,
            zIndex: 100,
            elevation: 100,
            transform: [
              { translateX: Animated.subtract(posX, drag.pw / 2) },
              { translateY: Animated.subtract(posY, drag.ph / 2) },
              { scale: overlayScale },
            ],
          }}
        >
          <PieceView shape={drag.shape} cell={cell} />
        </Animated.View>
      )}
    </View>
  );
}

function TrayPiece({
  piece,
  index,
  cell,
  slotW,
  slotH,
  dim,
  hidden,
}: {
  piece: Piece;
  index: number;
  cell: number;
  slotW: number;
  slotH: number;
  dim: boolean;
  hidden: boolean;
}) {
  const shape = getShape(piece.shapeId);
  const pitch = cell + CELL_GAP;
  const pw = shape.w * pitch - CELL_GAP;
  const ph = shape.h * pitch - CELL_GAP;
  const enter = useAnimatedValue(0);
  useEffect(() => {
    Animated.spring(enter, {
      toValue: 1,
      delay: index * 70,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [enter, index]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: (slotW - pw) / 2,
        top: (slotH - ph) / 2,
        width: pw,
        height: ph,
        opacity: hidden ? 0 : dim ? 0.4 : 1,
        transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.2, TRAY_SCALE] }) }],
      }}
    >
      <PieceView shape={shape} cell={cell} />
    </Animated.View>
  );
}
