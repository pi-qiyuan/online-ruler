var SharedLogic = SharedLogic || {};

SharedLogic.CONSTANTS = {
  MM_PER_INCH: 25.4,
  DEFAULT_PPI: 96,
  COFFEE_URL: "https://ko-fi.com/qiyuanyang",
  REVIEW_URL: "https://chromewebstore.google.com/detail/online-ruler/hdflbmnojjkedghfaioipcbjiainnpnn/reviews",
  UNITS: [['cm', 'unitCm', 'CM/MM'], ['in', 'unitIn', 'Inch']],
  MATERIALS: [['WOOD', 'matWood', 'Wood'], ['PLASTIC', 'matPlastic', 'Plastic'], ['METAL', 'matMetal', 'Metal']],
  COIN_REFERENCES: {
    default: { width: 24.26, height: 24.26 },
    en: { width: 24.26, height: 24.26 },
    de: { width: 23.25, height: 23.25 },
    es: { width: 23.25, height: 23.25 },
    fr: { width: 23.25, height: 23.25 },
    ja: { width: 22.6, height: 22.6 },
    ko: { width: 26.5, height: 26.5 },
    zh: { width: 22.25, height: 22.25 }
  },
  get MATERIAL_DETAILS() {
    return {
      WOOD: {
        baseColor: "#dcb35c",
        filterH: "woodFilterH",
        filterV: "woodFilterV"
      },
      PLASTIC: {
        baseColor: SharedLogic.COLORS[0].val,
        filterH: "plasticFilter",
        filterV: "plasticFilter"
      },
      METAL: {
        baseColor: "#bdc3c7",
        filterH: "metalFilterH",
        filterV: "metalFilterV"
      }
    };
  }
};

SharedLogic.COLORS = [
  { val: 'rgba(255, 255, 255, 0.85)', key: 'colorWhite', hex: '#FFFFFF' },
  { val: 'rgba(64, 235, 253, 0.85)', key: 'colorCyan', hex: '#40EBFD' },
  { val: 'rgba(255, 0, 234, 0.85)', key: 'colorMagenta', hex: '#FF00EA' },
  { val: 'rgba(255, 136, 229, 0.85)', key: 'colorPink', hex: '#FF88E5' },
  { val: 'rgba(255, 142, 55, 0.85)', key: 'colorOrange', hex: '#FF8E37' },
  { val: 'rgba(229, 249, 93, 0.85)', key: 'colorLime', hex: '#E5F95D' },
  { val: 'rgba(0, 255, 83, 0.85)', key: 'colorGreen', hex: '#00FF53' }
];
