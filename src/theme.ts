// Tasarımdaki (Figma) renk ve ölçüler.

export const colors = {
  bgTop: '#1B3A78',
  bgMid: '#12295A',
  bgBottom: '#081633',
  panel: '#14295A',
  panelLight: '#1D3C7E',
  panelBorder: 'rgba(120,170,255,0.22)',
  panelTop: '#26508F',
  panelBottom: '#183B73',
  overlay: 'rgba(3,10,28,0.74)',
  boardBg: '#0C1D44',
  cell: '#12285A',
  cellBorder: 'rgba(80,120,200,0.18)',
  text: '#FFFFFF',
  textDim: '#8FA9D9',
  textMuted: '#6F89BD',
  gold: '#FFC83D',
  goldDark: '#E59A00',
  primaryTop: '#7CCBFF',
  primaryBottom: '#2F7DE8',
  primaryEdge: '#1F5CC0',
  onPrimary: '#0B2A5B',
  secondaryTop: '#2F5199',
  secondaryBottom: '#233F7D',
  secondaryEdge: '#1A2F61',
  darkTop: '#1D3768',
  darkBottom: '#162C58',
  toggleOn: '#3A8CFF',
  toggleOff: '#1B2C52',
  knobOn: '#FFFFFF',
  knobOff: '#8FA4CC',
};

/** Tasarımdaki yazı tipi: Nunito (yuvarlak hatlı, kalın). */
export const fonts = {
  regular: 'Nunito_400Regular',
  semi: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extra: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
};

/** Blok renkleri: [açık, koyu] — 1..6 */
export const BLOCK_COLORS: Record<number, [string, string]> = {
  1: ['#7CCBFF', '#2C7BE5'], // mavi
  2: ['#FFE680', '#F5B400'], // sarı
  3: ['#FF93A6', '#E8405F'], // kırmızı/pembe
  4: ['#79E8B0', '#1FB872'], // yeşil
  5: ['#C9A8FF', '#7C4DE0'], // mor
  6: ['#FFB877', '#F2761F'], // turuncu
};

export const CELL_GAP = 2;
export const BOARD_PADDING = 6;
export const BOARD_BORDER = 1;

export const radius = {
  button: 18,
  card: 22,
  panel: 28,
};
