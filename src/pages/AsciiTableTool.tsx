import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import ToolPageLayout, { WorkspaceHeader, WorkspaceBody } from '../components/ToolPageLayout'

// ============================================================
// 数据
// ============================================================

interface AsciiEntry {
  dec: number
  hex: string
  oct: string
  bin: string
  html: string
  char: string
  desc: string
  category: 'control' | 'printable' | 'del'
}

const ASCII_DATA: AsciiEntry[] = [
  // 0-31: Control characters
  { dec: 0, hex: '00', oct: '000', bin: '0000 0000', html: '&amp;#0;', char: 'NUL', desc: '空字符 (Null)', category: 'control' },
  { dec: 1, hex: '01', oct: '001', bin: '0000 0001', html: '&amp;#1;', char: 'SOH', desc: '标题开始 (Start of Heading)', category: 'control' },
  { dec: 2, hex: '02', oct: '002', bin: '0000 0010', html: '&amp;#2;', char: 'STX', desc: '正文开始 (Start of Text)', category: 'control' },
  { dec: 3, hex: '03', oct: '003', bin: '0000 0011', html: '&amp;#3;', char: 'ETX', desc: '正文结束 (End of Text)', category: 'control' },
  { dec: 4, hex: '04', oct: '004', bin: '0000 0100', html: '&amp;#4;', char: 'EOT', desc: '传输结束 (End of Transmission)', category: 'control' },
  { dec: 5, hex: '05', oct: '005', bin: '0000 0101', html: '&amp;#5;', char: 'ENQ', desc: '请求 (Enquiry)', category: 'control' },
  { dec: 6, hex: '06', oct: '006', bin: '0000 0110', html: '&amp;#6;', char: 'ACK', desc: '确认 (Acknowledge)', category: 'control' },
  { dec: 7, hex: '07', oct: '007', bin: '0000 0111', html: '&amp;#7;', char: 'BEL', desc: '响铃 (Bell)', category: 'control' },
  { dec: 8, hex: '08', oct: '010', bin: '0000 1000', html: '&amp;#8;', char: 'BS', desc: '退格 (Backspace)', category: 'control' },
  { dec: 9, hex: '09', oct: '011', bin: '0000 1001', html: '&amp;#9;', char: 'TAB', desc: '水平制表符 (Tab)', category: 'control' },
  { dec: 10, hex: '0A', oct: '012', bin: '0000 1010', html: '&amp;#10;', char: 'LF', desc: '换行 (Line Feed)', category: 'control' },
  { dec: 11, hex: '0B', oct: '013', bin: '0000 1011', html: '&amp;#11;', char: 'VT', desc: '垂直制表符 (Vertical Tab)', category: 'control' },
  { dec: 12, hex: '0C', oct: '014', bin: '0000 1100', html: '&amp;#12;', char: 'FF', desc: '换页 (Form Feed)', category: 'control' },
  { dec: 13, hex: '0D', oct: '015', bin: '0000 1101', html: '&amp;#13;', char: 'CR', desc: '回车 (Carriage Return)', category: 'control' },
  { dec: 14, hex: '0E', oct: '016', bin: '0000 1110', html: '&amp;#14;', char: 'SO', desc: '移出 (Shift Out)', category: 'control' },
  { dec: 15, hex: '0F', oct: '017', bin: '0000 1111', html: '&amp;#15;', char: 'SI', desc: '移入 (Shift In)', category: 'control' },
  { dec: 16, hex: '10', oct: '020', bin: '0001 0000', html: '&amp;#16;', char: 'DLE', desc: '数据链路转义 (Data Link Escape)', category: 'control' },
  { dec: 17, hex: '11', oct: '021', bin: '0001 0001', html: '&amp;#17;', char: 'DC1', desc: '设备控制1 (XON)', category: 'control' },
  { dec: 18, hex: '12', oct: '022', bin: '0001 0010', html: '&amp;#18;', char: 'DC2', desc: '设备控制2', category: 'control' },
  { dec: 19, hex: '13', oct: '023', bin: '0001 0011', html: '&amp;#19;', char: 'DC3', desc: '设备控制3 (XOFF)', category: 'control' },
  { dec: 20, hex: '14', oct: '024', bin: '0001 0100', html: '&amp;#20;', char: 'DC4', desc: '设备控制4', category: 'control' },
  { dec: 21, hex: '15', oct: '025', bin: '0001 0101', html: '&amp;#21;', char: 'NAK', desc: '否认 (Negative Acknowledge)', category: 'control' },
  { dec: 22, hex: '16', oct: '026', bin: '0001 0110', html: '&amp;#22;', char: 'SYN', desc: '同步空闲 (Synchronous Idle)', category: 'control' },
  { dec: 23, hex: '17', oct: '027', bin: '0001 0111', html: '&amp;#23;', char: 'ETB', desc: '传输块结束 (End of Block)', category: 'control' },
  { dec: 24, hex: '18', oct: '030', bin: '0001 1000', html: '&amp;#24;', char: 'CAN', desc: '取消 (Cancel)', category: 'control' },
  { dec: 25, hex: '19', oct: '031', bin: '0001 1001', html: '&amp;#25;', char: 'EM', desc: '介质中断 (End of Medium)', category: 'control' },
  { dec: 26, hex: '1A', oct: '032', bin: '0001 1010', html: '&amp;#26;', char: 'SUB', desc: '替换 (Substitute)', category: 'control' },
  { dec: 27, hex: '1B', oct: '033', bin: '0001 1011', html: '&amp;#27;', char: 'ESC', desc: '转义 (Escape)', category: 'control' },
  { dec: 28, hex: '1C', oct: '034', bin: '0001 1100', html: '&amp;#28;', char: 'FS', desc: '文件分隔符 (File Separator)', category: 'control' },
  { dec: 29, hex: '1D', oct: '035', bin: '0001 1101', html: '&amp;#29;', char: 'GS', desc: '组分隔符 (Group Separator)', category: 'control' },
  { dec: 30, hex: '1E', oct: '036', bin: '0001 1110', html: '&amp;#30;', char: 'RS', desc: '记录分隔符 (Record Separator)', category: 'control' },
  { dec: 31, hex: '1F', oct: '037', bin: '0001 1111', html: '&amp;#31;', char: 'US', desc: '单元分隔符 (Unit Separator)', category: 'control' },
  // 32-126: Printable
  { dec: 32, hex: '20', oct: '040', bin: '0010 0000', html: '&amp;#32;', char: '␣', desc: '空格 (Space)', category: 'printable' },
  { dec: 33, hex: '21', oct: '041', bin: '0010 0001', html: '&amp;#33;', char: '!', desc: '感叹号', category: 'printable' },
  { dec: 34, hex: '22', oct: '042', bin: '0010 0010', html: '&amp;#34;', char: '"', desc: '双引号', category: 'printable' },
  { dec: 35, hex: '23', oct: '043', bin: '0010 0011', html: '&amp;#35;', char: '#', desc: '井号', category: 'printable' },
  { dec: 36, hex: '24', oct: '044', bin: '0010 0100', html: '&amp;#36;', char: '$', desc: '美元符号', category: 'printable' },
  { dec: 37, hex: '25', oct: '045', bin: '0010 0101', html: '&amp;#37;', char: '%', desc: '百分号', category: 'printable' },
  { dec: 38, hex: '26', oct: '046', bin: '0010 0110', html: '&amp;#38;', char: '&', desc: '与符号', category: 'printable' },
  { dec: 39, hex: '27', oct: '047', bin: '0010 0111', html: '&amp;#39;', char: "'", desc: '单引号', category: 'printable' },
  { dec: 40, hex: '28', oct: '050', bin: '0010 1000', html: '&amp;#40;', char: '(', desc: '左圆括号', category: 'printable' },
  { dec: 41, hex: '29', oct: '051', bin: '0010 1001', html: '&amp;#41;', char: ')', desc: '右圆括号', category: 'printable' },
  { dec: 42, hex: '2A', oct: '052', bin: '0010 1010', html: '&amp;#42;', char: '*', desc: '星号', category: 'printable' },
  { dec: 43, hex: '2B', oct: '053', bin: '0010 1011', html: '&amp;#43;', char: '+', desc: '加号', category: 'printable' },
  { dec: 44, hex: '2C', oct: '054', bin: '0010 1100', html: '&amp;#44;', char: ',', desc: '逗号', category: 'printable' },
  { dec: 45, hex: '2D', oct: '055', bin: '0010 1101', html: '&amp;#45;', char: '-', desc: '减号 / 连字符', category: 'printable' },
  { dec: 46, hex: '2E', oct: '056', bin: '0010 1110', html: '&amp;#46;', char: '.', desc: '句号', category: 'printable' },
  { dec: 47, hex: '2F', oct: '057', bin: '0010 1111', html: '&amp;#47;', char: '/', desc: '斜杠', category: 'printable' },
  { dec: 48, hex: '30', oct: '060', bin: '0011 0000', html: '&amp;#48;', char: '0', desc: '数字 0', category: 'printable' },
  { dec: 49, hex: '31', oct: '061', bin: '0011 0001', html: '&amp;#49;', char: '1', desc: '数字 1', category: 'printable' },
  { dec: 50, hex: '32', oct: '062', bin: '0011 0010', html: '&amp;#50;', char: '2', desc: '数字 2', category: 'printable' },
  { dec: 51, hex: '33', oct: '063', bin: '0011 0011', html: '&amp;#51;', char: '3', desc: '数字 3', category: 'printable' },
  { dec: 52, hex: '34', oct: '064', bin: '0011 0100', html: '&amp;#52;', char: '4', desc: '数字 4', category: 'printable' },
  { dec: 53, hex: '35', oct: '065', bin: '0011 0101', html: '&amp;#53;', char: '5', desc: '数字 5', category: 'printable' },
  { dec: 54, hex: '36', oct: '066', bin: '0011 0110', html: '&amp;#54;', char: '6', desc: '数字 6', category: 'printable' },
  { dec: 55, hex: '37', oct: '067', bin: '0011 0111', html: '&amp;#55;', char: '7', desc: '数字 7', category: 'printable' },
  { dec: 56, hex: '38', oct: '070', bin: '0011 1000', html: '&amp;#56;', char: '8', desc: '数字 8', category: 'printable' },
  { dec: 57, hex: '39', oct: '071', bin: '0011 1001', html: '&amp;#57;', char: '9', desc: '数字 9', category: 'printable' },
  { dec: 58, hex: '3A', oct: '072', bin: '0011 1010', html: '&amp;#58;', char: ':', desc: '冒号', category: 'printable' },
  { dec: 59, hex: '3B', oct: '073', bin: '0011 1011', html: '&amp;#59;', char: ';', desc: '分号', category: 'printable' },
  { dec: 60, hex: '3C', oct: '074', bin: '0011 1100', html: '&amp;#60;', char: '<', desc: '小于号', category: 'printable' },
  { dec: 61, hex: '3D', oct: '075', bin: '0011 1101', html: '&amp;#61;', char: '=', desc: '等于号', category: 'printable' },
  { dec: 62, hex: '3E', oct: '076', bin: '0011 1110', html: '&amp;#62;', char: '>', desc: '大于号', category: 'printable' },
  { dec: 63, hex: '3F', oct: '077', bin: '0011 1111', html: '&amp;#63;', char: '?', desc: '问号', category: 'printable' },
  { dec: 64, hex: '40', oct: '100', bin: '0100 0000', html: '&amp;#64;', char: '@', desc: '@ 符号', category: 'printable' },
  { dec: 65, hex: '41', oct: '101', bin: '0100 0001', html: '&amp;#65;', char: 'A', desc: '大写字母 A', category: 'printable' },
  { dec: 66, hex: '42', oct: '102', bin: '0100 0010', html: '&amp;#66;', char: 'B', desc: '大写字母 B', category: 'printable' },
  { dec: 67, hex: '43', oct: '103', bin: '0100 0011', html: '&amp;#67;', char: 'C', desc: '大写字母 C', category: 'printable' },
  { dec: 68, hex: '44', oct: '104', bin: '0100 0100', html: '&amp;#68;', char: 'D', desc: '大写字母 D', category: 'printable' },
  { dec: 69, hex: '45', oct: '105', bin: '0100 0101', html: '&amp;#69;', char: 'E', desc: '大写字母 E', category: 'printable' },
  { dec: 70, hex: '46', oct: '106', bin: '0100 0110', html: '&amp;#70;', char: 'F', desc: '大写字母 F', category: 'printable' },
  { dec: 71, hex: '47', oct: '107', bin: '0100 0111', html: '&amp;#71;', char: 'G', desc: '大写字母 G', category: 'printable' },
  { dec: 72, hex: '48', oct: '110', bin: '0100 1000', html: '&amp;#72;', char: 'H', desc: '大写字母 H', category: 'printable' },
  { dec: 73, hex: '49', oct: '111', bin: '0100 1001', html: '&amp;#73;', char: 'I', desc: '大写字母 I', category: 'printable' },
  { dec: 74, hex: '4A', oct: '112', bin: '0100 1010', html: '&amp;#74;', char: 'J', desc: '大写字母 J', category: 'printable' },
  { dec: 75, hex: '4B', oct: '113', bin: '0100 1011', html: '&amp;#75;', char: 'K', desc: '大写字母 K', category: 'printable' },
  { dec: 76, hex: '4C', oct: '114', bin: '0100 1100', html: '&amp;#76;', char: 'L', desc: '大写字母 L', category: 'printable' },
  { dec: 77, hex: '4D', oct: '115', bin: '0100 1101', html: '&amp;#77;', char: 'M', desc: '大写字母 M', category: 'printable' },
  { dec: 78, hex: '4E', oct: '116', bin: '0100 1110', html: '&amp;#78;', char: 'N', desc: '大写字母 N', category: 'printable' },
  { dec: 79, hex: '4F', oct: '117', bin: '0100 1111', html: '&amp;#79;', char: 'O', desc: '大写字母 O', category: 'printable' },
  { dec: 80, hex: '50', oct: '120', bin: '0101 0000', html: '&amp;#80;', char: 'P', desc: '大写字母 P', category: 'printable' },
  { dec: 81, hex: '51', oct: '121', bin: '0101 0001', html: '&amp;#81;', char: 'Q', desc: '大写字母 Q', category: 'printable' },
  { dec: 82, hex: '52', oct: '122', bin: '0101 0010', html: '&amp;#82;', char: 'R', desc: '大写字母 R', category: 'printable' },
  { dec: 83, hex: '53', oct: '123', bin: '0101 0011', html: '&amp;#83;', char: 'S', desc: '大写字母 S', category: 'printable' },
  { dec: 84, hex: '54', oct: '124', bin: '0101 0100', html: '&amp;#84;', char: 'T', desc: '大写字母 T', category: 'printable' },
  { dec: 85, hex: '55', oct: '125', bin: '0101 0101', html: '&amp;#85;', char: 'U', desc: '大写字母 U', category: 'printable' },
  { dec: 86, hex: '56', oct: '126', bin: '0101 0110', html: '&amp;#86;', char: 'V', desc: '大写字母 V', category: 'printable' },
  { dec: 87, hex: '57', oct: '127', bin: '0101 0111', html: '&amp;#87;', char: 'W', desc: '大写字母 W', category: 'printable' },
  { dec: 88, hex: '58', oct: '130', bin: '0101 1000', html: '&amp;#88;', char: 'X', desc: '大写字母 X', category: 'printable' },
  { dec: 89, hex: '59', oct: '131', bin: '0101 1001', html: '&amp;#89;', char: 'Y', desc: '大写字母 Y', category: 'printable' },
  { dec: 90, hex: '5A', oct: '132', bin: '0101 1010', html: '&amp;#90;', char: 'Z', desc: '大写字母 Z', category: 'printable' },
  { dec: 91, hex: '5B', oct: '133', bin: '0101 1011', html: '&amp;#91;', char: '[', desc: '左方括号', category: 'printable' },
  { dec: 92, hex: '5C', oct: '134', bin: '0101 1100', html: '&amp;#92;', char: '\\', desc: '反斜杠', category: 'printable' },
  { dec: 93, hex: '5D', oct: '135', bin: '0101 1101', html: '&amp;#93;', char: ']', desc: '右方括号', category: 'printable' },
  { dec: 94, hex: '5E', oct: '136', bin: '0101 1110', html: '&amp;#94;', char: '^', desc: '脱字符', category: 'printable' },
  { dec: 95, hex: '5F', oct: '137', bin: '0101 1111', html: '&amp;#95;', char: '_', desc: '下划线', category: 'printable' },
  { dec: 96, hex: '60', oct: '140', bin: '0110 0000', html: '&amp;#96;', char: '`', desc: '反引号', category: 'printable' },
  { dec: 97, hex: '61', oct: '141', bin: '0110 0001', html: '&amp;#97;', char: 'a', desc: '小写字母 a', category: 'printable' },
  { dec: 98, hex: '62', oct: '142', bin: '0110 0010', html: '&amp;#98;', char: 'b', desc: '小写字母 b', category: 'printable' },
  { dec: 99, hex: '63', oct: '143', bin: '0110 0011', html: '&amp;#99;', char: 'c', desc: '小写字母 c', category: 'printable' },
  { dec: 100, hex: '64', oct: '144', bin: '0110 0100', html: '&amp;#100;', char: 'd', desc: '小写字母 d', category: 'printable' },
  { dec: 101, hex: '65', oct: '145', bin: '0110 0101', html: '&amp;#101;', char: 'e', desc: '小写字母 e', category: 'printable' },
  { dec: 102, hex: '66', oct: '146', bin: '0110 0110', html: '&amp;#102;', char: 'f', desc: '小写字母 f', category: 'printable' },
  { dec: 103, hex: '67', oct: '147', bin: '0110 0111', html: '&amp;#103;', char: 'g', desc: '小写字母 g', category: 'printable' },
  { dec: 104, hex: '68', oct: '150', bin: '0110 1000', html: '&amp;#104;', char: 'h', desc: '小写字母 h', category: 'printable' },
  { dec: 105, hex: '69', oct: '151', bin: '0110 1001', html: '&amp;#105;', char: 'i', desc: '小写字母 i', category: 'printable' },
  { dec: 106, hex: '6A', oct: '152', bin: '0110 1010', html: '&amp;#106;', char: 'j', desc: '小写字母 j', category: 'printable' },
  { dec: 107, hex: '6B', oct: '153', bin: '0110 1011', html: '&amp;#107;', char: 'k', desc: '小写字母 k', category: 'printable' },
  { dec: 108, hex: '6C', oct: '154', bin: '0110 1100', html: '&amp;#108;', char: 'l', desc: '小写字母 l', category: 'printable' },
  { dec: 109, hex: '6D', oct: '155', bin: '0110 1101', html: '&amp;#109;', char: 'm', desc: '小写字母 m', category: 'printable' },
  { dec: 110, hex: '6E', oct: '156', bin: '0110 1110', html: '&amp;#110;', char: 'n', desc: '小写字母 n', category: 'printable' },
  { dec: 111, hex: '6F', oct: '157', bin: '0110 1111', html: '&amp;#111;', char: 'o', desc: '小写字母 o', category: 'printable' },
  { dec: 112, hex: '70', oct: '160', bin: '0111 0000', html: '&amp;#112;', char: 'p', desc: '小写字母 p', category: 'printable' },
  { dec: 113, hex: '71', oct: '161', bin: '0111 0001', html: '&amp;#113;', char: 'q', desc: '小写字母 q', category: 'printable' },
  { dec: 114, hex: '72', oct: '162', bin: '0111 0010', html: '&amp;#114;', char: 'r', desc: '小写字母 r', category: 'printable' },
  { dec: 115, hex: '73', oct: '163', bin: '0111 0011', html: '&amp;#115;', char: 's', desc: '小写字母 s', category: 'printable' },
  { dec: 116, hex: '74', oct: '164', bin: '0111 0100', html: '&amp;#116;', char: 't', desc: '小写字母 t', category: 'printable' },
  { dec: 117, hex: '75', oct: '165', bin: '0111 0101', html: '&amp;#117;', char: 'u', desc: '小写字母 u', category: 'printable' },
  { dec: 118, hex: '76', oct: '166', bin: '0111 0110', html: '&amp;#118;', char: 'v', desc: '小写字母 v', category: 'printable' },
  { dec: 119, hex: '77', oct: '167', bin: '0111 0111', html: '&amp;#119;', char: 'w', desc: '小写字母 w', category: 'printable' },
  { dec: 120, hex: '78', oct: '170', bin: '0111 1000', html: '&amp;#120;', char: 'x', desc: '小写字母 x', category: 'printable' },
  { dec: 121, hex: '79', oct: '171', bin: '0111 1001', html: '&amp;#121;', char: 'y', desc: '小写字母 y', category: 'printable' },
  { dec: 122, hex: '7A', oct: '172', bin: '0111 1010', html: '&amp;#122;', char: 'z', desc: '小写字母 z', category: 'printable' },
  { dec: 123, hex: '7B', oct: '173', bin: '0111 1011', html: '&amp;#123;', char: '{', desc: '左花括号', category: 'printable' },
  { dec: 124, hex: '7C', oct: '174', bin: '0111 1100', html: '&amp;#124;', char: '|', desc: '竖线', category: 'printable' },
  { dec: 125, hex: '7D', oct: '175', bin: '0111 1101', html: '&amp;#125;', char: '}', desc: '右花括号', category: 'printable' },
  { dec: 126, hex: '7E', oct: '176', bin: '0111 1110', html: '&amp;#126;', char: '~', desc: '波浪号', category: 'printable' },
  // 127: DEL
  { dec: 127, hex: '7F', oct: '177', bin: '0111 1111', html: '&amp;#127;', char: 'DEL', desc: '删除 (Delete)', category: 'del' },
]

const CATEGORY_FILTERS = [
  { label: '全部 (128)', value: 'all', count: 128 },
  { label: '可打印字符', value: 'printable', count: 95 },
  { label: '控制字符', value: 'control', count: 32 },
  { label: 'DEL', value: 'del', count: 1 },
]

// ============================================================
// 组件
// ============================================================

export default function AsciiTableTool() {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')

  const filtered = useMemo(() => {
    let list = ASCII_DATA
    if (catFilter !== 'all') list = list.filter((x) => x.category === catFilter)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (x) =>
          x.char.toLowerCase().includes(q) ||
          x.desc.toLowerCase().includes(q) ||
          x.dec.toString().includes(q) ||
          x.hex.toLowerCase().includes(q) ||
          x.html.toLowerCase().includes(q),
      )
    }
    return list
  }, [search, catFilter])

  return (
    <ToolPageLayout toolId="ascii-table">
      <WorkspaceHeader title="ASCII 对照表">
        <span className="region-count-badge">{filtered.length} / {ASCII_DATA.length}</span>
      </WorkspaceHeader>
      <WorkspaceBody>
        <div className="ascii-tool">
          {/* 搜索 */}
          <div className="ascii-search-box">
            <Search size={16} className="ascii-search-icon" />
            <input
              type="text"
              className="ascii-search-input"
              placeholder="搜索 字符 / 十进制 / 十六进制 / 描述 ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              spellCheck={false}
            />
          </div>

          {/* 分类筛选 */}
          <div className="ascii-filter-row">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`ascii-filter-chip ${catFilter === f.value ? 'active' : ''}`}
                onClick={() => setCatFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 表格 */}
          <div className="ascii-table-wrap">
            <table className="ascii-table">
              <thead>
                <tr>
                  <th className="ascii-col-dec">Dec</th>
                  <th className="ascii-col-hex">Hex</th>
                  <th className="ascii-col-oct">Oct</th>
                  <th className="ascii-col-bin">Binary</th>
                  <th className="ascii-col-html">HTML 实体</th>
                  <th className="ascii-col-char">字符</th>
                  <th className="ascii-col-desc">描述</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="ascii-empty">无匹配结果</td>
                  </tr>
                ) : (
                  filtered.map((x) => (
                    <tr key={x.dec} className={x.category === 'control' || x.category === 'del' ? 'ascii-row-ctrl' : ''}>
                      <td className="ascii-col-dec">{x.dec}</td>
                      <td className="ascii-col-hex">
                        <code>{x.hex}</code>
                      </td>
                      <td className="ascii-col-oct">{x.oct}</td>
                      <td className="ascii-col-bin">
                        <code>{x.bin}</code>
                      </td>
                      <td className="ascii-col-html">
                        <code>{x.html}</code>
                      </td>
                      <td className="ascii-col-char">
                        <span className="ascii-char-cell">{x.char}</span>
                      </td>
                      <td className="ascii-col-desc">{x.desc}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="ascii-footer-hint">
            标准 ASCII 码表，共 128 个字符（0-127）。支持 <kbd>Ctrl</kbd> + <kbd>F</kbd> 浏览器快速搜索。
          </div>
        </div>
      </WorkspaceBody>
    </ToolPageLayout>
  )
}
