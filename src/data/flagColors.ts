// Colores representativos de cada bandera (para el confeti del campeón).
// 2-4 colores por país; si falta alguno, se usa una paleta festiva.
export const FLAG_COLORS: Record<string, string[]> = {
  MEX: ['#006847', '#ffffff', '#ce1126'],
  RSA: ['#007a4d', '#ffb612', '#de3831', '#002395'],
  COR: ['#cd2e3a', '#0047a0', '#ffffff'],
  CZE: ['#11457e', '#d7141a', '#ffffff'],
  CAN: ['#ff0000', '#ffffff'],
  QAT: ['#8a1538', '#ffffff'],
  SUI: ['#d52b1e', '#ffffff'],
  BOS: ['#002395', '#fecb00', '#ffffff'],
  BRA: ['#009c3b', '#ffdf00', '#002776'],
  MAR: ['#c1272d', '#006233'],
  ESC: ['#005eb8', '#ffffff'],
  HAI: ['#00209f', '#d21034', '#ffffff'],
  USA: ['#3c3b6e', '#b22234', '#ffffff'],
  PAR: ['#d52b1e', '#0038a8', '#ffffff'],
  AUS: ['#00008b', '#ff0000', '#ffffff'],
  TUR: ['#e30a17', '#ffffff'],
  ALE: ['#000000', '#dd0000', '#ffce00'],
  ECU: ['#ffdd00', '#034ea2', '#ed1c24'],
  CDM: ['#f77f00', '#ffffff', '#009e60'],
  CUR: ['#002b7f', '#f9d90f', '#ffffff'],
  PBA: ['#ae1c28', '#ffffff', '#21468b'],
  JAP: ['#bc002d', '#ffffff'],
  TUN: ['#e70013', '#ffffff'],
  SWE: ['#006aa7', '#fecc00'],
  BEL: ['#000000', '#fae042', '#ed2939'],
  IRA: ['#239f40', '#ffffff', '#da0000'],
  EGI: ['#ce1126', '#ffffff', '#000000'],
  NZL: ['#00247d', '#cc142b', '#ffffff'],
  ESP: ['#aa151b', '#f1bf00'],
  URU: ['#0038a8', '#ffffff', '#fcd116'],
  ARA: ['#006c35', '#ffffff'],
  CAB: ['#003893', '#cf2027', '#ffffff', '#f7d116'],
  FRA: ['#0055a4', '#ffffff', '#ef4135'],
  SEN: ['#00853f', '#fdef42', '#e31b23'],
  NOR: ['#ba0c2f', '#00205b', '#ffffff'],
  IRK: ['#ce1126', '#ffffff', '#007a3d'],
  ARG: ['#74acdf', '#ffffff', '#f6b40e'],
  ALG: ['#006233', '#ffffff', '#d21034'],
  AUT: ['#ed2939', '#ffffff'],
  JOR: ['#007a3d', '#ce1126', '#ffffff', '#000000'],
  POR: ['#006600', '#ff0000', '#ffff00'],
  UZB: ['#1eb53a', '#0099b5', '#ce1126', '#ffffff'],
  COL: ['#fcd116', '#003893', '#ce1126'],
  COD: ['#007fff', '#f7d518', '#ce1021'],
  ING: ['#ffffff', '#ce1124'],
  CRO: ['#ff0000', '#ffffff', '#171796'],
  GHA: ['#ce1126', '#fcd116', '#006b3f', '#000000'],
  PAN: ['#005293', '#d21034', '#ffffff'],
}

const FESTIVE = ['#FFC21A', '#1FA85C', '#2F6DF0', '#E5322B', '#ffffff']

export function flagColors(teamId?: string | null): string[] {
  const cols = teamId ? FLAG_COLORS[teamId] : undefined
  return cols && cols.length ? cols : FESTIVE
}
