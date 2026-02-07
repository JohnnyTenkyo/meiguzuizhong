// 股票板块分类
export type StockSector = 
  | 'AI' // AI概念
  | 'Semiconductor' // 半导体
  | 'Bitcoin' // 比特币/加密货币
  | 'EV' // 电动车
  | 'Cloud' // 云计算
  | 'Fintech' // 金融科技
  | 'Energy' // 能源
  | 'Healthcare' // 医疗健康
  | 'Retail' // 零售
  | 'Tech' // 科技
  | 'ETF' // ETF基金
  | 'Other'; // 其他

export interface StockInfo {
  symbol: string;
  sectors: StockSector[]; // 一只股票可以属于多个板块
}

// 扩展后的股票池（包含板块分类）
export const STOCK_POOL: StockInfo[] = [
  // AI概念股
  { symbol: 'NVDA', sectors: ['AI', 'Semiconductor'] },
  { symbol: 'MSFT', sectors: ['AI', 'Cloud', 'Tech'] },
  { symbol: 'GOOGL', sectors: ['AI', 'Cloud', 'Tech'] },
  { symbol: 'GOOG', sectors: ['AI', 'Cloud', 'Tech'] },
  { symbol: 'META', sectors: ['AI', 'Tech'] },
  { symbol: 'AMZN', sectors: ['AI', 'Cloud', 'Retail', 'Tech'] },
  { symbol: 'AAPL', sectors: ['AI', 'Tech'] },
  { symbol: 'ORCL', sectors: ['AI', 'Cloud', 'Tech'] },
  { symbol: 'CRM', sectors: ['AI', 'Cloud', 'Tech'] },
  { symbol: 'IBM', sectors: ['AI', 'Cloud', 'Tech'] },
  { symbol: 'PLTR', sectors: ['AI', 'Tech'] },
  { symbol: 'AI', sectors: ['AI', 'Tech'] },
  { symbol: 'BBAI', sectors: ['AI', 'Tech'] },
  { symbol: 'SOUN', sectors: ['AI', 'Tech'] },
  
  // 半导体股
  { symbol: 'AMD', sectors: ['AI', 'Semiconductor'] },
  { symbol: 'AVGO', sectors: ['AI', 'Semiconductor'] },
  { symbol: 'TSM', sectors: ['Semiconductor'] },
  { symbol: 'ASML', sectors: ['Semiconductor'] },
  { symbol: 'INTC', sectors: ['Semiconductor'] },
  { symbol: 'QCOM', sectors: ['Semiconductor'] },
  { symbol: 'MU', sectors: ['Semiconductor'] },
  { symbol: 'MRVL', sectors: ['Semiconductor'] },
  { symbol: 'ARM', sectors: ['AI', 'Semiconductor'] },
  { symbol: 'SMCI', sectors: ['AI', 'Semiconductor'] },
  { symbol: 'MCHP', sectors: ['Semiconductor'] },
  { symbol: 'SOXL', sectors: ['Semiconductor', 'ETF'] }, // 3倍做多半导体ETF
  
  // 比特币/加密货币概念股
  { symbol: 'MSTR', sectors: ['Bitcoin'] },
  { symbol: 'COIN', sectors: ['Bitcoin', 'Fintech'] },
  { symbol: 'MARA', sectors: ['Bitcoin'] },
  { symbol: 'RIOT', sectors: ['Bitcoin'] },
  { symbol: 'CLSK', sectors: ['Bitcoin'] },
  { symbol: 'HUT', sectors: ['Bitcoin'] },
  { symbol: 'IREN', sectors: ['Bitcoin'] },
  { symbol: 'CIFR', sectors: ['Bitcoin'] },
  { symbol: 'BTBT', sectors: ['Bitcoin'] },
  { symbol: 'APLD', sectors: ['Bitcoin'] },
  { symbol: 'BTC', sectors: ['Bitcoin'] },
  { symbol: 'BTQ', sectors: ['Bitcoin'] },
  
  // 电动车概念股
  { symbol: 'TSLA', sectors: ['EV', 'Tech'] },
  { symbol: 'RIVN', sectors: ['EV'] },
  { symbol: 'NIO', sectors: ['EV'] },
  { symbol: 'LI', sectors: ['EV'] },
  { symbol: 'LCID', sectors: ['EV'] },
  { symbol: 'F', sectors: ['EV'] },
  { symbol: 'GM', sectors: ['EV'] },
  
  // 量子计算概念股
  { symbol: 'IONQ', sectors: ['AI', 'Tech'] },
  { symbol: 'RGTI', sectors: ['AI', 'Tech'] },
  { symbol: 'QUBT', sectors: ['AI', 'Tech'] },
  { symbol: 'QBTS', sectors: ['AI', 'Tech'] },
  
  // 金融科技
  { symbol: 'SOFI', sectors: ['Fintech'] },
  { symbol: 'HOOD', sectors: ['Fintech'] },
  { symbol: 'PYPL', sectors: ['Fintech'] },
  { symbol: 'SQ', sectors: ['Fintech'] },
  { symbol: 'AFRM', sectors: ['Fintech'] },
  { symbol: 'UPST', sectors: ['Fintech', 'AI'] },
  
  // 云计算
  { symbol: 'SNOW', sectors: ['Cloud', 'Tech'] },
  { symbol: 'DDOG', sectors: ['Cloud', 'Tech'] },
  { symbol: 'NET', sectors: ['Cloud', 'Tech'] },
  { symbol: 'ZS', sectors: ['Cloud', 'Tech'] },
  { symbol: 'CRWD', sectors: ['Cloud', 'Tech'] },
  
  // 能源股
  { symbol: 'XOM', sectors: ['Energy'] },
  { symbol: 'CVX', sectors: ['Energy'] },
  { symbol: 'OXY', sectors: ['Energy'] },
  { symbol: 'DVN', sectors: ['Energy'] },
  { symbol: 'PBR', sectors: ['Energy'] },
  { symbol: 'USO', sectors: ['Energy', 'ETF'] },
  { symbol: 'SMR', sectors: ['Energy'] }, // 核能
  { symbol: 'OKLO', sectors: ['Energy'] }, // 核能
  { symbol: 'VST', sectors: ['Energy'] },
  { symbol: 'AES', sectors: ['Energy'] },
  
  // 医疗健康
  { symbol: 'UNH', sectors: ['Healthcare'] },
  { symbol: 'LLY', sectors: ['Healthcare'] },
  { symbol: 'NVO', sectors: ['Healthcare'] },
  { symbol: 'MRNA', sectors: ['Healthcare'] },
  { symbol: 'PFE', sectors: ['Healthcare'] },
  { symbol: 'AMGN', sectors: ['Healthcare'] },
  { symbol: 'BMY', sectors: ['Healthcare'] },
  { symbol: 'HIMS', sectors: ['Healthcare', 'Tech'] },
  { symbol: 'RXRX', sectors: ['Healthcare', 'AI'] },
  
  // 零售
  { symbol: 'WMT', sectors: ['Retail'] },
  { symbol: 'COST', sectors: ['Retail'] },
  { symbol: 'TGT', sectors: ['Retail'] },
  { symbol: 'LULU', sectors: ['Retail'] },
  { symbol: 'NKE', sectors: ['Retail'] },
  
  // 航空航天
  { symbol: 'RKLB', sectors: ['Tech'] },
  { symbol: 'LUNR', sectors: ['Tech'] },
  { symbol: 'ASTS', sectors: ['Tech'] },
  { symbol: 'BA', sectors: ['Tech'] },
  { symbol: 'LMT', sectors: ['Tech'] },
  { symbol: 'LHX', sectors: ['Tech'] },
  
  // 其他科技股
  { symbol: 'NFLX', sectors: ['Tech'] },
  { symbol: 'SHOP', sectors: ['Tech', 'Fintech'] },
  { symbol: 'SPOT', sectors: ['Tech'] },
  { symbol: 'RBLX', sectors: ['Tech'] },
  { symbol: 'U', sectors: ['Tech'] },
  { symbol: 'DUOL', sectors: ['Tech'] },
  { symbol: 'SNAP', sectors: ['Tech'] },
  { symbol: 'RDDT', sectors: ['Tech'] },
  { symbol: 'TTD', sectors: ['Tech'] },
  { symbol: 'APP', sectors: ['Tech'] },
  { symbol: 'APPS', sectors: ['Tech'] },
  
  // 中概股
  { symbol: 'BABA', sectors: ['Tech', 'Retail'] },
  { symbol: 'JD', sectors: ['Tech', 'Retail'] },
  { symbol: 'PDD', sectors: ['Tech', 'Retail'] },
  { symbol: 'BEKE', sectors: ['Tech'] },
  { symbol: 'BILI', sectors: ['Tech'] },
  { symbol: 'FUTU', sectors: ['Fintech'] },
  
  // ETF
  { symbol: 'SPY', sectors: ['ETF'] },
  { symbol: 'QQQ', sectors: ['ETF'] },
  { symbol: 'IWM', sectors: ['ETF'] },
  { symbol: 'TQQQ', sectors: ['ETF'] }, // 3倍做多纳指
  { symbol: 'SQQQ', sectors: ['ETF'] }, // 3倍做空纳指
  { symbol: 'VGT', sectors: ['ETF'] }, // 科技ETF
  { symbol: 'VOO', sectors: ['ETF'] },
  { symbol: 'GLD', sectors: ['ETF'] }, // 黄金ETF
  { symbol: 'TLT', sectors: ['ETF'] }, // 长期国债ETF
  { symbol: 'UVXY', sectors: ['ETF'] }, // 波动率ETF
  { symbol: 'UVIX', sectors: ['ETF'] },
  
  // 原有股票池中的其他股票
  { symbol: 'GDXU', sectors: ['ETF'] },
  { symbol: 'TSLL', sectors: ['EV', 'ETF'] },
  { symbol: 'OPEN', sectors: ['Tech'] },
  { symbol: 'OPEX', sectors: ['Other'] },
  { symbol: 'DJT', sectors: ['Other'] },
  { symbol: 'DJTU', sectors: ['Other'] },
  { symbol: 'ONDS', sectors: ['Other'] },
  { symbol: 'NVTS', sectors: ['Other'] },
  { symbol: 'DXYZ', sectors: ['Other'] },
  { symbol: 'ALAB', sectors: ['Healthcare'] },
  { symbol: 'CVNA', sectors: ['Retail'] },
  { symbol: 'CRWV', sectors: ['Other'] },
  { symbol: 'CRCL', sectors: ['Other'] },
  { symbol: 'DPST', sectors: ['ETF'] },
  { symbol: 'FIG', sectors: ['Other'] },
  { symbol: 'SBET', sectors: ['Other'] },
  { symbol: 'TEM', sectors: ['Other'] },
  { symbol: 'MP', sectors: ['Other'] },
  { symbol: 'STX', sectors: ['Tech'] },
  { symbol: 'AGQ', sectors: ['ETF'] },
  { symbol: 'FMCC', sectors: ['Other'] },
  { symbol: 'FNMA', sectors: ['Other'] },
  { symbol: 'CRML', sectors: ['Other'] },
  { symbol: 'NVTX', sectors: ['Other'] },
  { symbol: 'ONDL', sectors: ['Other'] },
  { symbol: 'TSNF', sectors: ['Other'] },
  { symbol: 'TSRS', sectors: ['Other'] },
  { symbol: 'TSES', sectors: ['Other'] },
  { symbol: 'TSIC', sectors: ['Other'] },
  { symbol: 'TSSD', sectors: ['Other'] },
  { symbol: 'NXDR', sectors: ['Other'] },
  { symbol: 'TGL', sectors: ['Other'] },
  { symbol: 'SMX', sectors: ['Other'] },
  { symbol: 'WRD', sectors: ['Other'] },
  { symbol: 'NAIL', sectors: ['ETF'] },
  { symbol: 'BETR', sectors: ['Other'] },
  { symbol: 'SNGX', sectors: ['Other'] },
  { symbol: 'DGNX', sectors: ['Other'] },
  { symbol: 'SNDK', sectors: ['Tech'] },
  { symbol: 'WDC', sectors: ['Tech'] },
  { symbol: 'QS', sectors: ['EV'] },
  { symbol: 'NNE', sectors: ['Other'] },
  { symbol: 'SERV', sectors: ['Other'] },
  { symbol: 'APG', sectors: ['Other'] },
  { symbol: 'PZZA', sectors: ['Retail'] },
  { symbol: 'GRRR', sectors: ['Other'] },
  { symbol: 'ARQQ', sectors: ['Other'] },
  { symbol: 'LAES', sectors: ['Other'] },
  { symbol: 'NMAX', sectors: ['Other'] },
  { symbol: 'AAL', sectors: ['Other'] },
  { symbol: 'QMCO', sectors: ['Other'] },
  { symbol: 'WOLF', sectors: ['Other'] },
  { symbol: 'UPSX', sectors: ['Other'] },
  { symbol: 'CRCA', sectors: ['Other'] },
  { symbol: 'CWVX', sectors: ['Other'] },
  { symbol: 'OKLL', sectors: ['Other'] },
  { symbol: 'RGTX', sectors: ['Other'] },
  { symbol: 'RDTL', sectors: ['Other'] },
  { symbol: 'AMPX', sectors: ['Other'] },
  { symbol: 'BYND', sectors: ['Other'] },
  { symbol: 'MEME', sectors: ['Other'] },
  { symbol: 'POWI', sectors: ['Tech'] },
  { symbol: 'POET', sectors: ['Tech'] },
  { symbol: 'USAR', sectors: ['Other'] },
  { symbol: 'FIGR', sectors: ['Other'] },
  { symbol: 'GEMI', sectors: ['Other'] },
  { symbol: 'ORBS', sectors: ['Other'] },
  { symbol: 'ATAI', sectors: ['Healthcare'] },
  { symbol: 'OPAD', sectors: ['Other'] },
  { symbol: 'DUO', sectors: ['Other'] },
  { symbol: 'KTOS', sectors: ['Tech'] },
  { symbol: 'BLSH', sectors: ['Other'] },
  { symbol: 'TLRY', sectors: ['Other'] },
  { symbol: 'VSCO', sectors: ['Other'] },
  { symbol: 'IXHL', sectors: ['Other'] },
  { symbol: 'XRPT', sectors: ['Other'] },
  { symbol: 'BLK', sectors: ['Other'] },
  { symbol: 'VOR', sectors: ['Other'] },
  { symbol: 'ASST', sectors: ['Other'] },
  { symbol: 'BMNR', sectors: ['Other'] },
  { symbol: 'AEVA', sectors: ['Tech'] },
  { symbol: 'TRON', sectors: ['Other'] },
  { symbol: 'AGIG', sectors: ['Other'] },
  { symbol: 'LBRT', sectors: ['Energy'] },
  { symbol: 'PSH', sectors: ['Other'] },
  { symbol: 'AIRO', sectors: ['Other'] },
  { symbol: 'CHYM', sectors: ['Other'] },
  { symbol: 'NAKA', sectors: ['Other'] },
  { symbol: 'BNS', sectors: ['Other'] },
  { symbol: 'NBIS', sectors: ['Other'] },
  { symbol: 'RGC', sectors: ['Other'] },
  { symbol: 'PONY', sectors: ['Other'] },
  { symbol: 'MELI', sectors: ['Tech', 'Retail'] },
  { symbol: 'BULL', sectors: ['Other'] },
  { symbol: 'TMC', sectors: ['Other'] },
  { symbol: 'B', sectors: ['Other'] },
  { symbol: 'NEM', sectors: ['Other'] },
  { symbol: 'BRK.B', sectors: ['Other'] },
  { symbol: 'PM', sectors: ['Other'] },
  { symbol: 'KHC', sectors: ['Other'] },
  { symbol: 'YINN', sectors: ['ETF'] },
  { symbol: 'VZ', sectors: ['Tech'] },
  { symbol: 'HII', sectors: ['Other'] },
  { symbol: 'V', sectors: ['Fintech'] },
  { symbol: 'VRT', sectors: ['Other'] },
  { symbol: 'GDS', sectors: ['Tech'] },
  { symbol: '.VIX', sectors: ['Other'] },
  { symbol: 'KO', sectors: ['Other'] },
  { symbol: 'AA', sectors: ['Other'] },
  { symbol: 'TMF', sectors: ['ETF'] },
  { symbol: 'GME', sectors: ['Other'] },
  { symbol: 'WKEY', sectors: ['Other'] },
  { symbol: 'CSCO', sectors: ['Tech'] },
  { symbol: 'AUR', sectors: ['Other'] },
  { symbol: 'KITT', sectors: ['Other'] },
  { symbol: 'ACHR', sectors: ['Tech'] },
  { symbol: 'CRNC', sectors: ['Other'] },
  { symbol: 'RR', sectors: ['Other'] },
  { symbol: 'XOVR', sectors: ['Other'] },
  { symbol: 'HOLO', sectors: ['Other'] },
  { symbol: 'SES', sectors: ['Other'] },
  { symbol: 'CELH', sectors: ['Other'] },
  { symbol: 'VRSN', sectors: ['Tech'] },
  { symbol: 'SIRI', sectors: ['Other'] },
  { symbol: 'NUKK', sectors: ['Other'] },
  { symbol: 'AVDL', sectors: ['Other'] },
  { symbol: 'KC', sectors: ['Other'] },

  // 金融板块大市值公司
  { symbol: 'JPM', sectors: ['Other'] }, // 摩根大通
  { symbol: 'BAC', sectors: ['Other'] }, // 美国银行
  { symbol: 'WFC', sectors: ['Other'] }, // 富国银行
  { symbol: 'C', sectors: ['Other'] }, // 花旗集团
  { symbol: 'GS', sectors: ['Other'] }, // 高盛
  { symbol: 'MS', sectors: ['Other'] }, // 摩根士丹利
  { symbol: 'AXP', sectors: ['Fintech'] }, // 美国运通
  { symbol: 'SCHW', sectors: ['Fintech'] }, // 嘉信理财
  { symbol: 'MA', sectors: ['Fintech'] }, // 万事达
  { symbol: 'USB', sectors: ['Other'] }, // 美国合众银行
  { symbol: 'PNC', sectors: ['Other'] }, // PNC金融
  { symbol: 'TFC', sectors: ['Other'] }, // Truist金融
  
  // 消费品板块
  { symbol: 'PG', sectors: ['Other'] }, // 宝洁
  { symbol: 'PEP', sectors: ['Other'] }, // 百事可乐
  { symbol: 'MCD', sectors: ['Retail'] }, // 麦当劳
  { symbol: 'SBUX', sectors: ['Retail'] }, // 星巴克
  { symbol: 'HD', sectors: ['Retail'] }, // 家得宝
  { symbol: 'LOW', sectors: ['Retail'] }, // 劳氏
  { symbol: 'DIS', sectors: ['Tech'] }, // 迪士尼
  { symbol: 'CMCSA', sectors: ['Tech'] }, // 康卡斯特
  { symbol: 'T', sectors: ['Tech'] }, // AT&T
  { symbol: 'TMUS', sectors: ['Tech'] }, // T-Mobile
  
  // 工业板块
  { symbol: 'CAT', sectors: ['Other'] }, // 卡特彼勒
  { symbol: 'DE', sectors: ['Other'] }, // 迪尔
  { symbol: 'GE', sectors: ['Other'] }, // 通用电气
  { symbol: 'MMM', sectors: ['Other'] }, // 3M
  { symbol: 'HON', sectors: ['Tech'] }, // 霍尼韦尔
  { symbol: 'UPS', sectors: ['Other'] }, // UPS
  { symbol: 'FDX', sectors: ['Other'] }, // 联邦快递
  { symbol: 'RTX', sectors: ['Tech'] }, // 雷神技术
  { symbol: 'NOC', sectors: ['Tech'] }, // 诺斯罗普格鲁曼
  { symbol: 'GD', sectors: ['Tech'] }, // 通用动力
  
  // 医疗保健板块补充
  { symbol: 'JNJ', sectors: ['Healthcare'] }, // 强生
  { symbol: 'ABBV', sectors: ['Healthcare'] }, // 艾伯维
  { symbol: 'TMO', sectors: ['Healthcare'] }, // 赛默飞世尔
  { symbol: 'ABT', sectors: ['Healthcare'] }, // 雅培
  { symbol: 'DHR', sectors: ['Healthcare'] }, // 丹纳赫
  { symbol: 'MRK', sectors: ['Healthcare'] }, // 默克
  { symbol: 'GILD', sectors: ['Healthcare'] }, // 吉利德
  { symbol: 'CVS', sectors: ['Healthcare'] }, // CVS Health
  { symbol: 'CI', sectors: ['Healthcare'] }, // 信诺
  { symbol: 'ISRG', sectors: ['Healthcare'] }, // 直觉外科
  
  // 能源板块补充
  { symbol: 'COP', sectors: ['Energy'] }, // 康菲石油
  { symbol: 'SLB', sectors: ['Energy'] }, // 斯伦贝谢
  { symbol: 'EOG', sectors: ['Energy'] }, // EOG能源
  { symbol: 'MPC', sectors: ['Energy'] }, // Marathon石油
  { symbol: 'PSX', sectors: ['Energy'] }, // Phillips 66
  { symbol: 'VLO', sectors: ['Energy'] }, // Valero能源
  { symbol: 'HAL', sectors: ['Energy'] }, // 哈里伯顿
  
  // 科技板块补充
  { symbol: 'ADBE', sectors: ['Tech'] }, // Adobe
  { symbol: 'INTU', sectors: ['Tech'] }, // Intuit
  { symbol: 'NOW', sectors: ['Cloud', 'Tech'] }, // ServiceNow
  { symbol: 'PANW', sectors: ['Cloud', 'Tech'] }, // Palo Alto Networks
  { symbol: 'AMAT', sectors: ['Semiconductor'] }, // 应用材料
  { symbol: 'LRCX', sectors: ['Semiconductor'] }, // Lam Research
  { symbol: 'KLAC', sectors: ['Semiconductor'] }, // KLA
  { symbol: 'SNPS', sectors: ['Semiconductor'] }, // 新思科技
  { symbol: 'CDNS', sectors: ['Semiconductor'] }, // Cadence
  { symbol: 'TXN', sectors: ['Semiconductor'] }, // 德州仪器
  { symbol: 'ADI', sectors: ['Semiconductor'] }, // 亚德诺
  { symbol: 'NXPI', sectors: ['Semiconductor'] }, // 恩智浦
  { symbol: 'ON', sectors: ['Semiconductor'] }, // 安森美
  
  // 零售板块补充
  { symbol: 'TJX', sectors: ['Retail'] }, // TJX Companies
  { symbol: 'ROST', sectors: ['Retail'] }, // Ross Stores
  { symbol: 'DG', sectors: ['Retail'] }, // Dollar General
  { symbol: 'DLTR', sectors: ['Retail'] }, // Dollar Tree
  
  // 房地产/REITs
  { symbol: 'AMT', sectors: ['Other'] }, // American Tower
  { symbol: 'PLD', sectors: ['Other'] }, // Prologis
  { symbol: 'CCI', sectors: ['Other'] }, // Crown Castle
  { symbol: 'EQIX', sectors: ['Tech'] }, // Equinix
  { symbol: 'SPG', sectors: ['Other'] }, // Simon Property
  
  // 公用事业
  { symbol: 'NEE', sectors: ['Energy'] }, // NextEra Energy
  { symbol: 'DUK', sectors: ['Energy'] }, // Duke Energy
  { symbol: 'SO', sectors: ['Energy'] }, // Southern Company
  { symbol: 'D', sectors: ['Energy'] }, // Dominion Energy
  
  // 材料板块
  { symbol: 'LIN', sectors: ['Other'] }, // 林德
  { symbol: 'APD', sectors: ['Other'] }, // Air Products
  { symbol: 'SHW', sectors: ['Other'] }, // 宣伟
  { symbol: 'FCX', sectors: ['Other'] }, // Freeport-McMoRan
  
  // 更多消费品
  { symbol: 'CL', sectors: ['Other'] }, // 高露洁
  { symbol: 'KMB', sectors: ['Other'] }, // 金佰利
  { symbol: 'GIS', sectors: ['Other'] }, // 通用磨坊
  { symbol: 'K', sectors: ['Other'] }, // 家乐氏
  { symbol: 'HSY', sectors: ['Other'] }, // 好时
  { symbol: 'MDLZ', sectors: ['Other'] }, // 亿滋国际
  
  // 汽车板块补充
  { symbol: 'STLA', sectors: ['EV'] }, // Stellantis
  { symbol: 'HMC', sectors: ['EV'] }, // 本田
  { symbol: 'TM', sectors: ['EV'] }, // 丰田
  
  // 保险板块
  { symbol: 'UNP', sectors: ['Other'] }, // Union Pacific
  { symbol: 'NSC', sectors: ['Other'] }, // Norfolk Southern
  { symbol: 'CSX', sectors: ['Other'] }, // CSX
  
  // 化工板块
  { symbol: 'DOW', sectors: ['Other'] }, // 陶氏化学
  { symbol: 'DD', sectors: ['Other'] }, // 杜邦
  { symbol: 'EMN', sectors: ['Other'] }, // 伊士曼化工
  
  // 生物科技补充
  { symbol: 'REGN', sectors: ['Healthcare'] }, // Regeneron
  { symbol: 'VRTX', sectors: ['Healthcare'] }, // Vertex
  { symbol: 'BIIB', sectors: ['Healthcare'] }, // Biogen
  { symbol: 'ILMN', sectors: ['Healthcare'] }, // Illumina
  
  // 通信设备
  { symbol: 'ANET', sectors: ['Tech'] }, // Arista Networks
  { symbol: 'FTNT', sectors: ['Cloud', 'Tech'] }, // Fortinet
  
  // 软件补充
  { symbol: 'WDAY', sectors: ['Cloud', 'Tech'] }, // Workday
  { symbol: 'TEAM', sectors: ['Cloud', 'Tech'] }, // Atlassian
  { symbol: 'MNST', sectors: ['Other'] }, // Monster Beverage
  
  // 半导体设备补充
  { symbol: 'ENTG', sectors: ['Semiconductor'] }, // Entegris
  { symbol: 'MPWR', sectors: ['Semiconductor'] }, // Monolithic Power
  
  // 电商/互联网补充
  { symbol: 'EBAY', sectors: ['Tech', 'Retail'] }, // eBay
  { symbol: 'ETSY', sectors: ['Tech', 'Retail'] }, // Etsy
  
  // 游戏
  { symbol: 'EA', sectors: ['Tech'] }, // Electronic Arts
  { symbol: 'TTWO', sectors: ['Tech'] }, // Take-Two
  { symbol: 'ATVI', sectors: ['Tech'] }, // Activision (如果还独立交易)
  
  // 数据中心/云基础设施
  { symbol: 'DLR', sectors: ['Tech'] }, // Digital Realty
  
  // 支付处理
  { symbol: 'FIS', sectors: ['Fintech'] }, // Fidelity National
  { symbol: 'FISV', sectors: ['Fintech'] }, // Fiserv
  { symbol: 'ADP', sectors: ['Tech'] }, // ADP
  { symbol: 'PAYX', sectors: ['Tech'] }, // Paychex
  
  // 旅游/酒店
  { symbol: 'MAR', sectors: ['Other'] }, // 万豪
  { symbol: 'HLT', sectors: ['Other'] }, // 希尔顿
  { symbol: 'BKNG', sectors: ['Tech'] }, // Booking Holdings
  { symbol: 'ABNB', sectors: ['Tech'] }, // Airbnb
  
  // 航空补充
  { symbol: 'DAL', sectors: ['Other'] }, // Delta
  { symbol: 'UAL', sectors: ['Other'] }, // United
  { symbol: 'LUV', sectors: ['Other'] }, // Southwest
  
  // 娱乐/媒体
  { symbol: 'WBD', sectors: ['Tech'] }, // Warner Bros Discovery
  { symbol: 'PARA', sectors: ['Tech'] }, // Paramount
  
  // 食品饮料补充
  { symbol: 'STZ', sectors: ['Other'] }, // Constellation Brands
  { symbol: 'TAP', sectors: ['Other'] }, // Molson Coors
  
  // 建筑材料
  { symbol: 'VMC', sectors: ['Other'] }, // Vulcan Materials
  { symbol: 'MLM', sectors: ['Other'] }, // Martin Marietta
  
  // 废物管理
  { symbol: 'WM', sectors: ['Other'] }, // Waste Management
  { symbol: 'RSG', sectors: ['Other'] }, // Republic Services
  
  // 医疗设备补充
  { symbol: 'MDT', sectors: ['Healthcare'] }, // 美敦力
  { symbol: 'SYK', sectors: ['Healthcare'] }, // 史赛克
  { symbol: 'BSX', sectors: ['Healthcare'] }, // 波士顿科学
  { symbol: 'EW', sectors: ['Healthcare'] }, // Edwards Lifesciences
  { symbol: 'ZBH', sectors: ['Healthcare'] }, // Zimmer Biomet
  
  // 诊断/实验室
  { symbol: 'DGX', sectors: ['Healthcare'] }, // Quest Diagnostics
  { symbol: 'LH', sectors: ['Healthcare'] }, // LabCorp
  
  // 制药补充
  { symbol: 'ZTS', sectors: ['Healthcare'] }, // Zoetis (动物保健)
  { symbol: 'IDXX', sectors: ['Healthcare'] }, // IDEXX
  
  // 工业气体
  { symbol: 'ECL', sectors: ['Other'] }, // Ecolab
  
  // 电子元件
  { symbol: 'TEL', sectors: ['Tech'] }, // TE Connectivity
  { symbol: 'APH', sectors: ['Tech'] }, // Amphenol
  
  // 测试测量
  { symbol: 'KEYS', sectors: ['Tech'] }, // Keysight
  
  // 工程软件
  { symbol: 'ANSS', sectors: ['Tech'] }, // Ansys
  { symbol: 'ADSK', sectors: ['Tech'] }, // Autodesk
  
  // 数据分析
  { symbol: 'SPLK', sectors: ['Tech'] }, // Splunk
  { symbol: 'DDOG', sectors: ['Cloud', 'Tech'] }, // Datadog (已有)
  
  // 网络安全补充
  { symbol: 'CYBR', sectors: ['Cloud', 'Tech'] }, // CyberArk
  { symbol: 'OKTA', sectors: ['Cloud', 'Tech'] }, // Okta
  
  // 电商平台
  { symbol: 'W', sectors: ['Tech', 'Retail'] }, // Wayfair
  
  // 在线旅游
  { symbol: 'EXPE', sectors: ['Tech'] }, // Expedia
  { symbol: 'TRIP', sectors: ['Tech'] }, // TripAdvisor
  
  // 社交媒体补充
  { symbol: 'PINS', sectors: ['Tech'] }, // Pinterest
  { symbol: 'TWTR', sectors: ['Tech'] }, // Twitter (如果还交易)
  
  // 云通信
  { symbol: 'TWLO', sectors: ['Cloud', 'Tech'] }, // Twilio
  { symbol: 'ZM', sectors: ['Cloud', 'Tech'] }, // Zoom
  { symbol: 'DOCN', sectors: ['Cloud', 'Tech'] }, // DigitalOcean
  
  // 数据库
  { symbol: 'MDB', sectors: ['Cloud', 'Tech'] }, // MongoDB
  { symbol: 'ESTC', sectors: ['Cloud', 'Tech'] }, // Elastic
  
  // 半导体IP
  { symbol: 'CEVA', sectors: ['Semiconductor'] }, // CEVA
  
  // 光学/激光
  { symbol: 'COHR', sectors: ['Tech'] }, // Coherent
  { symbol: 'LITE', sectors: ['Tech'] }, // Lumentum
  
  // 存储补充
  { symbol: 'PSTG', sectors: ['Tech'] }, // Pure Storage
  { symbol: 'NTAP', sectors: ['Tech'] }, // NetApp

  // 更多金融板块
  { symbol: 'BK', sectors: ['Other'] }, // Bank of New York Mellon
  { symbol: 'BLK', sectors: ['Other'] }, // BlackRock (已有，保留)
  { symbol: 'SPGI', sectors: ['Other'] }, // S&P Global
  { symbol: 'CME', sectors: ['Other'] }, // CME Group
  { symbol: 'ICE', sectors: ['Other'] }, // Intercontinental Exchange
  { symbol: 'MCO', sectors: ['Other'] }, // Moody's
  { symbol: 'AON', sectors: ['Other'] }, // Aon
  { symbol: 'MMC', sectors: ['Other'] }, // Marsh & McLennan
  { symbol: 'AJG', sectors: ['Other'] }, // Arthur J. Gallagher
  { symbol: 'CB', sectors: ['Other'] }, // Chubb
  { symbol: 'TRV', sectors: ['Other'] }, // Travelers
  { symbol: 'PGR', sectors: ['Other'] }, // Progressive
  { symbol: 'ALL', sectors: ['Other'] }, // Allstate
  { symbol: 'MET', sectors: ['Other'] }, // MetLife
  { symbol: 'PRU', sectors: ['Other'] }, // Prudential
  { symbol: 'AIG', sectors: ['Other'] }, // AIG
  { symbol: 'AFL', sectors: ['Other'] }, // Aflac
  { symbol: 'HIG', sectors: ['Other'] }, // Hartford Financial
  
  // 更多医疗板块
  { symbol: 'ELV', sectors: ['Healthcare'] }, // Elevance Health
  { symbol: 'HUM', sectors: ['Healthcare'] }, // Humana
  { symbol: 'CNC', sectors: ['Healthcare'] }, // Centene
  { symbol: 'MOH', sectors: ['Healthcare'] }, // Molina Healthcare
  { symbol: 'VTRS', sectors: ['Healthcare'] }, // Viatris
  { symbol: 'CAH', sectors: ['Healthcare'] }, // Cardinal Health
  { symbol: 'MCK', sectors: ['Healthcare'] }, // McKesson
  { symbol: 'COR', sectors: ['Healthcare'] }, // Cencora
  { symbol: 'PODD', sectors: ['Healthcare'] }, // Insulet
  { symbol: 'DXCM', sectors: ['Healthcare'] }, // DexCom
  { symbol: 'ALGN', sectors: ['Healthcare'] }, // Align Technology
  { symbol: 'HOLX', sectors: ['Healthcare'] }, // Hologic
  { symbol: 'BDX', sectors: ['Healthcare'] }, // Becton Dickinson
  { symbol: 'BAX', sectors: ['Healthcare'] }, // Baxter
  { symbol: 'RMD', sectors: ['Healthcare'] }, // ResMed
  { symbol: 'TECH', sectors: ['Healthcare'] }, // Bio-Techne
  { symbol: 'WAT', sectors: ['Healthcare'] }, // Waters
  { symbol: 'A', sectors: ['Healthcare'] }, // Agilent
  { symbol: 'PKI', sectors: ['Healthcare'] }, // PerkinElmer
  { symbol: 'IQV', sectors: ['Healthcare'] }, // IQVIA
  
  // 更多科技板块
  { symbol: 'FICO', sectors: ['Tech'] }, // Fair Isaac
  { symbol: 'CTSH', sectors: ['Tech'] }, // Cognizant
  { symbol: 'GDDY', sectors: ['Tech'] }, // GoDaddy
  { symbol: 'AKAM', sectors: ['Tech'] }, // Akamai
  { symbol: 'JNPR', sectors: ['Tech'] }, // Juniper Networks
  { symbol: 'FFIV', sectors: ['Tech'] }, // F5 Networks
  { symbol: 'NTCT', sectors: ['Tech'] }, // NetScout
  { symbol: 'RNG', sectors: ['Tech'] }, // RingCentral
  { symbol: 'BILL', sectors: ['Tech'] }, // Bill.com
  { symbol: 'PAYC', sectors: ['Tech'] }, // Paycom
  { symbol: 'ZI', sectors: ['Tech'] }, // ZoomInfo
  { symbol: 'HUBS', sectors: ['Tech'] }, // HubSpot
  { symbol: 'VEEV', sectors: ['Tech'] }, // Veeva Systems
  { symbol: 'DOCU', sectors: ['Tech'] }, // DocuSign
  { symbol: 'BOX', sectors: ['Tech'] }, // Box
  { symbol: 'DBX', sectors: ['Tech'] }, // Dropbox
  { symbol: 'COUP', sectors: ['Tech'] }, // Coupa Software
  { symbol: 'PCTY', sectors: ['Tech'] }, // Paylocity
  { symbol: 'GWRE', sectors: ['Tech'] }, // Guidewire
  { symbol: 'SMAR', sectors: ['Tech'] }, // Smartsheet
  
  // 更多消费板块
  { symbol: 'ORLY', sectors: ['Retail'] }, // O'Reilly Automotive
  { symbol: 'AZO', sectors: ['Retail'] }, // AutoZone
  { symbol: 'AAP', sectors: ['Retail'] }, // Advance Auto Parts
  { symbol: 'TSCO', sectors: ['Retail'] }, // Tractor Supply
  { symbol: 'BBY', sectors: ['Retail'] }, // Best Buy
  { symbol: 'GPS', sectors: ['Retail'] }, // Gap
  { symbol: 'ANF', sectors: ['Retail'] }, // Abercrombie & Fitch
  { symbol: 'AEO', sectors: ['Retail'] }, // American Eagle
  { symbol: 'URBN', sectors: ['Retail'] }, // Urban Outfitters
  { symbol: 'RL', sectors: ['Retail'] }, // Ralph Lauren
  { symbol: 'PVH', sectors: ['Retail'] }, // PVH (Calvin Klein, Tommy Hilfiger)
  { symbol: 'TPR', sectors: ['Retail'] }, // Tapestry (Coach, Kate Spade)
  { symbol: 'CPRI', sectors: ['Retail'] }, // Capri (Versace, Michael Kors)
  { symbol: 'VFC', sectors: ['Retail'] }, // VF Corp (Vans, North Face)
  { symbol: 'UAA', sectors: ['Retail'] }, // Under Armour
  { symbol: 'CROX', sectors: ['Retail'] }, // Crocs
  { symbol: 'DECK', sectors: ['Retail'] }, // Deckers (UGG, HOKA)
  { symbol: 'SKX', sectors: ['Retail'] }, // Skechers
  { symbol: 'FL', sectors: ['Retail'] }, // Foot Locker
  { symbol: 'DKS', sectors: ['Retail'] }, // Dick's Sporting Goods
  
  // 更多工业板块
  { symbol: 'EMR', sectors: ['Other'] }, // Emerson Electric
  { symbol: 'ETN', sectors: ['Other'] }, // Eaton
  { symbol: 'PH', sectors: ['Other'] }, // Parker Hannifin
  { symbol: 'ROK', sectors: ['Other'] }, // Rockwell Automation
  { symbol: 'AME', sectors: ['Other'] }, // Ametek
  { symbol: 'ITW', sectors: ['Other'] }, // Illinois Tool Works
  { symbol: 'DOV', sectors: ['Other'] }, // Dover
  { symbol: 'IR', sectors: ['Other'] }, // Ingersoll Rand
  { symbol: 'XYL', sectors: ['Other'] }, // Xylem
  { symbol: 'IEX', sectors: ['Other'] }, // IDEX
  { symbol: 'FTV', sectors: ['Other'] }, // Fortive
  { symbol: 'GNRC', sectors: ['Other'] }, // Generac
  { symbol: 'PWR', sectors: ['Other'] }, // Quanta Services
  { symbol: 'J', sectors: ['Other'] }, // Jacobs Solutions
  { symbol: 'FLR', sectors: ['Other'] }, // Fluor
  { symbol: 'KBR', sectors: ['Other'] }, // KBR
  { symbol: 'CHRW', sectors: ['Other'] }, // C.H. Robinson
  { symbol: 'JBHT', sectors: ['Other'] }, // J.B. Hunt
  { symbol: 'ODFL', sectors: ['Other'] }, // Old Dominion Freight
  { symbol: 'XPO', sectors: ['Other'] }, // XPO Logistics
  
  // 更多能源板块
  { symbol: 'KMI', sectors: ['Energy'] }, // Kinder Morgan
  { symbol: 'WMB', sectors: ['Energy'] }, // Williams Companies
  { symbol: 'OKE', sectors: ['Energy'] }, // ONEOK
  { symbol: 'LNG', sectors: ['Energy'] }, // Cheniere Energy
  { symbol: 'TRGP', sectors: ['Energy'] }, // Targa Resources
  { symbol: 'ET', sectors: ['Energy'] }, // Energy Transfer
  { symbol: 'EPD', sectors: ['Energy'] }, // Enterprise Products
  { symbol: 'FANG', sectors: ['Energy'] }, // Diamondback Energy
  { symbol: 'HES', sectors: ['Energy'] }, // Hess
  { symbol: 'MRO', sectors: ['Energy'] }, // Marathon Oil
  { symbol: 'APA', sectors: ['Energy'] }, // APA Corporation
  { symbol: 'BKR', sectors: ['Energy'] }, // Baker Hughes
  { symbol: 'NOV', sectors: ['Energy'] }, // NOV
  { symbol: 'FTI', sectors: ['Energy'] }, // TechnipFMC
  
  // 更多材料板块
  { symbol: 'NUE', sectors: ['Other'] }, // Nucor
  { symbol: 'STLD', sectors: ['Other'] }, // Steel Dynamics
  { symbol: 'RS', sectors: ['Other'] }, // Reliance Steel
  { symbol: 'X', sectors: ['Other'] }, // United States Steel
  { symbol: 'CLF', sectors: ['Other'] }, // Cleveland-Cliffs
  { symbol: 'MT', sectors: ['Other'] }, // ArcelorMittal
  { symbol: 'PKG', sectors: ['Other'] }, // Packaging Corp
  { symbol: 'IP', sectors: ['Other'] }, // International Paper
  { symbol: 'WRK', sectors: ['Other'] }, // WestRock
  { symbol: 'AVY', sectors: ['Other'] }, // Avery Dennison
  { symbol: 'SEE', sectors: ['Other'] }, // Sealed Air
  { symbol: 'BALL', sectors: ['Other'] }, // Ball Corporation
  { symbol: 'AMCR', sectors: ['Other'] }, // Amcor
  { symbol: 'CCK', sectors: ['Other'] }, // Crown Holdings
  { symbol: 'MOS', sectors: ['Other'] }, // Mosaic
  { symbol: 'CF', sectors: ['Other'] }, // CF Industries
  { symbol: 'FMC', sectors: ['Other'] }, // FMC Corporation
  { symbol: 'ALB', sectors: ['Other'] }, // Albemarle
  { symbol: 'CE', sectors: ['Other'] }, // Celanese
  { symbol: 'PPG', sectors: ['Other'] }, // PPG Industries

  // 更多热门科技股
  { symbol: 'SQ', sectors: ['Fintech'] }, // Block (已有，保留)
  { symbol: 'ROKU', sectors: ['Tech'] }, // Roku
  { symbol: 'LYFT', sectors: ['Tech'] }, // Lyft
  { symbol: 'UBER', sectors: ['Tech'] }, // Uber
  { symbol: 'DASH', sectors: ['Tech'] }, // DoorDash
  { symbol: 'ABNB', sectors: ['Tech'] }, // Airbnb (已有)
  { symbol: 'CPNG', sectors: ['Tech', 'Retail'] }, // Coupang
  { symbol: 'SE', sectors: ['Tech'] }, // Sea Limited
  { symbol: 'GRAB', sectors: ['Tech'] }, // Grab
  { symbol: 'DIDI', sectors: ['Tech'] }, // DiDi
  { symbol: 'PATH', sectors: ['Tech'] }, // UiPath
  { symbol: 'U', sectors: ['Tech'] }, // Unity (已有)
  { symbol: 'RBLX', sectors: ['Tech'] }, // Roblox (已有)
  { symbol: 'MTCH', sectors: ['Tech'] }, // Match Group
  { symbol: 'BMBL', sectors: ['Tech'] }, // Bumble
  { symbol: 'YELP', sectors: ['Tech'] }, // Yelp
  { symbol: 'GRUB', sectors: ['Tech'] }, // Grubhub
  { symbol: 'CHWY', sectors: ['Retail'] }, // Chewy
  { symbol: 'PETS', sectors: ['Retail'] }, // PetMed Express
  
  // 更多生物科技
  { symbol: 'BNTX', sectors: ['Healthcare'] }, // BioNTech
  { symbol: 'NVAX', sectors: ['Healthcare'] }, // Novavax
  { symbol: 'SGEN', sectors: ['Healthcare'] }, // Seagen
  { symbol: 'EXAS', sectors: ['Healthcare'] }, // Exact Sciences
  { symbol: 'INCY', sectors: ['Healthcare'] }, // Incyte
  { symbol: 'BMRN', sectors: ['Healthcare'] }, // BioMarin
  { symbol: 'ALNY', sectors: ['Healthcare'] }, // Alnylam
  { symbol: 'SRPT', sectors: ['Healthcare'] }, // Sarepta
  { symbol: 'JAZZ', sectors: ['Healthcare'] }, // Jazz Pharmaceuticals
  { symbol: 'UTHR', sectors: ['Healthcare'] }, // United Therapeutics
  { symbol: 'RARE', sectors: ['Healthcare'] }, // Ultragenyx
  { symbol: 'FOLD', sectors: ['Healthcare'] }, // Amicus Therapeutics
  { symbol: 'BLUE', sectors: ['Healthcare'] }, // bluebird bio
  { symbol: 'CRSP', sectors: ['Healthcare'] }, // CRISPR Therapeutics
  { symbol: 'EDIT', sectors: ['Healthcare'] }, // Editas Medicine
  { symbol: 'NTLA', sectors: ['Healthcare'] }, // Intellia Therapeutics
  { symbol: 'BEAM', sectors: ['Healthcare'] }, // Beam Therapeutics
  { symbol: 'VERV', sectors: ['Healthcare'] }, // Verve Therapeutics
  { symbol: 'ARWR', sectors: ['Healthcare'] }, // Arrowhead Pharmaceuticals
  { symbol: 'IONS', sectors: ['Healthcare'] }, // Ionis Pharmaceuticals
  
  // 更多消费品牌
  { symbol: 'EL', sectors: ['Other'] }, // Estée Lauder
  { symbol: 'CLX', sectors: ['Other'] }, // Clorox
  { symbol: 'CHD', sectors: ['Other'] }, // Church & Dwight
  { symbol: 'CAG', sectors: ['Other'] }, // Conagra
  { symbol: 'CPB', sectors: ['Other'] }, // Campbell Soup
  { symbol: 'HRL', sectors: ['Other'] }, // Hormel
  { symbol: 'SJM', sectors: ['Other'] }, // J.M. Smucker
  { symbol: 'MKC', sectors: ['Other'] }, // McCormick
  { symbol: 'TSN', sectors: ['Other'] }, // Tyson Foods
  { symbol: 'BF.B', sectors: ['Other'] }, // Brown-Forman
  { symbol: 'SAM', sectors: ['Other'] }, // Boston Beer
  { symbol: 'FIZZ', sectors: ['Other'] }, // National Beverage
  { symbol: 'KDP', sectors: ['Other'] }, // Keurig Dr Pepper
  { symbol: 'MNST', sectors: ['Other'] }, // Monster (已有)
  { symbol: 'CELH', sectors: ['Other'] }, // Celsius (已有)
  
  // 更多餐饮
  { symbol: 'YUM', sectors: ['Retail'] }, // Yum! Brands
  { symbol: 'QSR', sectors: ['Retail'] }, // Restaurant Brands
  { symbol: 'CMG', sectors: ['Retail'] }, // Chipotle
  { symbol: 'DPZ', sectors: ['Retail'] }, // Domino's
  { symbol: 'WEN', sectors: ['Retail'] }, // Wendy's
  { symbol: 'JACK', sectors: ['Retail'] }, // Jack in the Box
  { symbol: 'SHAK', sectors: ['Retail'] }, // Shake Shack
  { symbol: 'WING', sectors: ['Retail'] }, // Wingstop
  { symbol: 'TXRH', sectors: ['Retail'] }, // Texas Roadhouse
  { symbol: 'BLMN', sectors: ['Retail'] }, // Bloomin' Brands
  { symbol: 'DRI', sectors: ['Retail'] }, // Darden
  { symbol: 'EAT', sectors: ['Retail'] }, // Brinker
  
  // 更多房地产REITs
  { symbol: 'O', sectors: ['Other'] }, // Realty Income
  { symbol: 'PSA', sectors: ['Other'] }, // Public Storage
  { symbol: 'WELL', sectors: ['Other'] }, // Welltower
  { symbol: 'AVB', sectors: ['Other'] }, // AvalonBay
  { symbol: 'EQR', sectors: ['Other'] }, // Equity Residential
  { symbol: 'VTR', sectors: ['Other'] }, // Ventas
  { symbol: 'DLR', sectors: ['Tech'] }, // Digital Realty (已有)
  { symbol: 'SBAC', sectors: ['Other'] }, // SBA Communications
  { symbol: 'INVH', sectors: ['Other'] }, // Invitation Homes
  { symbol: 'EXR', sectors: ['Other'] }, // Extra Space Storage
  { symbol: 'CUBE', sectors: ['Other'] }, // CubeSmart
  { symbol: 'LSI', sectors: ['Other'] }, // Life Storage
  
  // 更多公用事业
  { symbol: 'AEP', sectors: ['Energy'] }, // American Electric Power
  { symbol: 'EXC', sectors: ['Energy'] }, // Exelon
  { symbol: 'XEL', sectors: ['Energy'] }, // Xcel Energy
  { symbol: 'ED', sectors: ['Energy'] }, // Con Edison
  { symbol: 'WEC', sectors: ['Energy'] }, // WEC Energy
  { symbol: 'ES', sectors: ['Energy'] }, // Eversource
  { symbol: 'AEE', sectors: ['Energy'] }, // Ameren
  { symbol: 'CMS', sectors: ['Energy'] }, // CMS Energy
  { symbol: 'DTE', sectors: ['Energy'] }, // DTE Energy
  { symbol: 'PPL', sectors: ['Energy'] }, // PPL
  { symbol: 'FE', sectors: ['Energy'] }, // FirstEnergy
  { symbol: 'ETR', sectors: ['Energy'] }, // Entergy
  { symbol: 'CNP', sectors: ['Energy'] }, // CenterPoint Energy
  { symbol: 'AWK', sectors: ['Other'] }, // American Water Works
];

// 导出所有股票代码（保持向后兼容）
export const US_STOCKS = STOCK_POOL.map(stock => stock.symbol);

// 按板块获取股票列表
export function getStocksBySector(sector: StockSector): string[] {
  return STOCK_POOL
    .filter(stock => stock.sectors.includes(sector))
    .map(stock => stock.symbol);
}

// 获取股票的板块信息
export function getStockSectors(symbol: string): StockSector[] {
  const stock = STOCK_POOL.find(s => s.symbol === symbol);
  return stock?.sectors || ['Other'];
}

// 板块中文名称映射
export const SECTOR_NAMES: Record<StockSector, string> = {
  'AI': 'AI概念',
  'Semiconductor': '半导体',
  'Bitcoin': '比特币/加密货币',
  'EV': '电动车',
  'Cloud': '云计算',
  'Fintech': '金融科技',
  'Energy': '能源',
  'Healthcare': '医疗健康',
  'Retail': '零售',
  'Tech': '科技',
  'ETF': 'ETF基金',
  'Other': '其他',
};
