import { Empty } from "antd";
import { useMemo } from "react";
import { getProfileRoundScores } from "../../utils/profileYearlyScores";

const colors = ["#fbbf24", "#22d3ee", "#c4b5fd", "#fb7185"];

export default function ProfileYearlyScoreChart({ history }) {
  const { rounds, series } = useMemo(() => getProfileRoundScores(history), [history]);
  if (!rounds.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่มีผลประเมินสำหรับเปรียบเทียบรายรอบ" />;

  const width = Math.max(720, rounds.length * 130);
  const maximum = Math.max(1, Math.ceil(Math.max(...series.flatMap((line) => line.points.filter(Boolean).map((p) => p.score))) * 1.25));
  const x = (index) => rounds.length === 1 ? width / 2 : 80 + index / (rounds.length - 1) * (width - 160);
  const y = (score) => 300 - score / maximum * 230;

  return (
    <div className="profile-yearly-chart">
      <div className="profile-yearly-chart-heading"><div><span>ROUND COMPARISON</span><h3>เส้นทางผลการประเมิน</h3></div><b>{rounds.length} รอบที่มีผลประเมิน</b></div>
      <p className="profile-yearly-chart-note">คะแนนรวมเฉลี่ยของผลที่ส่งแล้วในแต่ละรอบ แยกสีตามประเภทการประเมิน</p>
      <div className="profile-yearly-chart-legend">
        {series.map((line, index) => <span key={line.name}><i style={{ background: colors[index % colors.length] }} />{line.name}</span>)}
      </div>
      <div className="profile-yearly-chart-scroll" tabIndex={0} aria-label="กราฟเปรียบเทียบคะแนนรายรอบ เลื่อนแนวนอนได้">
        <svg viewBox={`0 0 ${width} 354`} style={{ minWidth: width }} role="img" aria-label="กราฟเส้นคะแนนรวมเฉลี่ยรายรอบ ดูค่ารายละเอียดในตารางใต้กราฟ">
          {[0, 1, 2, 3, 4].map((tick) => {
            const score = maximum * tick / 4;
            return <g key={tick}>
              <line x1="64" x2={width - 40} y1={y(score)} y2={y(score)} stroke="#ffffff" strokeOpacity="0.12" strokeDasharray="4 5" />
              <text x="52" y={y(score) + 4} textAnchor="end" fill="#a8bdd7" fontSize="12">{score.toFixed(1)}</text>
            </g>;
          })}
          {rounds.map((round) => <text key={round.id} x={x(round.index)} y="334" textAnchor="middle" fill="#a8bdd7" fontSize="13"><title>{round.name} · {round.id}</title>{round.label}</text>)}
          {series.map((line, index) => {
            const color = colors[index % colors.length];
            let previous = false;
            const path = line.points.map((point) => {
              if (!point) { previous = false; return ""; }
              const command = previous ? "L" : "M";
              previous = true;
              return `${command}${x(point.index)},${y(point.score)}`;
            }).join(" ");
            return <g key={line.name}>
              {line.points.filter(Boolean).map((point) => <rect key={`bar-${point.id}`} x={x(point.index) - 14 + (index - (series.length - 1) / 2) * Math.min(22, 60 / series.length)} y={y(point.score)} width={Math.min(20, 60 / series.length)} height={300 - y(point.score)} rx="4" fill={color} opacity="0.09" />)}
              <path d={path} fill="none" stroke={color} strokeWidth="10" opacity="0.08" strokeLinejoin="round" />
              <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />
              {line.points.filter(Boolean).map((point) => <g key={point.id} className="profile-yearly-chart-point" tabIndex={0} role="img" aria-label={`${line.name} รอบ ${point.label} คะแนน ${point.score.toFixed(2)}`}>
                <title>{line.name} · รอบ {point.label}: {point.score.toFixed(2)} คะแนน · {point.count} ผลประเมิน</title>
                <circle cx={x(point.index)} cy={y(point.score)} r="13" fill={color} opacity="0.14" />
                <circle cx={x(point.index)} cy={y(point.score)} r="6" fill={color} stroke="#fff" strokeWidth="2" />
                <text x={x(point.index)} y={y(point.score) - 22 - index * 17} textAnchor="middle" fill={color} fontSize="14" fontWeight="700" stroke="#142238" strokeWidth="4" paintOrder="stroke">{point.score.toFixed(2)}</text>
              </g>)}
            </g>;
          })}
        </svg>
      </div>
      {rounds.length === 1 && <p className="profile-yearly-chart-note">มีผลประเมินเพียงรอบเดียว จะแสดงเส้นเปรียบเทียบเมื่อมีผลในรอบอื่นเพิ่ม</p>}
      <details open>
        <summary>ตารางคะแนนรายรอบ</summary>
        <div className="profile-yearly-chart-scroll">
          <table><thead><tr><th>ประเภทการประเมิน</th><th>รอบประเมิน</th><th>คะแนนเฉลี่ย</th><th>ผลประเมิน</th><th>รหัสรอบ</th></tr></thead>
            <tbody>{series.flatMap((line) => line.points.filter(Boolean).map((point) => <tr key={point.id}><td>{line.name}</td><td>{point.label}</td><td>{point.score.toFixed(2)}</td><td>{point.count}</td><td>{point.id}</td></tr>))}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
