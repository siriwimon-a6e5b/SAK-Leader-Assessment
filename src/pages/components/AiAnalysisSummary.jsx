import { RobotOutlined } from "@ant-design/icons";

const SECTION_ALIASES = [
  { title: "สรุปภาพรวม", aliases: ["สรุปภาพรวม", "ภาพรวม", "บทสรุป", "สรุปผลการวิเคราะห์"] },
  { title: "จุดแข็งที่พบ", aliases: ["จุดแข็งที่พบ", "จุดแข็ง", "จุดเด่น"] },
  { title: "ประเด็นที่ควรพัฒนา", aliases: ["ประเด็นที่ควรพัฒนา", "จุดที่ควรพัฒนา", "ข้อควรพัฒนา"] },
  { title: "ข้อเสนอแนะที่นำไปปฏิบัติได้", aliases: ["ข้อเสนอแนะที่นำไปปฏิบัติได้", "ข้อเสนอแนะ", "แนวทางพัฒนา"] },
];

function cleanLine(line) {
  return String(line || "")
    .trim()
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^\*\*(.*?)\*\*$/, "$1")
    .trim();
}

function findSectionHeading(line) {
  for (const section of SECTION_ALIASES) {
    const alias = section.aliases.find((name) => (
      line === name || line.startsWith(`${name}:`) || line.startsWith(`${name}：`)
    ));

    if (alias) return { title: section.title, alias };
  }

  return null;
}

function parseAiAnalysis(text) {
  const sections = [];
  let currentSection = null;

  String(text || "").split(/\r?\n/).forEach((rawLine) => {
    const line = cleanLine(rawLine);
    if (!line) return;

    const heading = findSectionHeading(line);

    if (heading) {
      currentSection = { title: heading.title, paragraphs: [], bullets: [] };
      sections.push(currentSection);
      const remainder = line.slice(heading.alias.length).replace(/^\s*[:：]\s*/, "");
      if (remainder) currentSection.paragraphs.push(remainder);
      return;
    }

    if (!currentSection) {
      currentSection = { title: "ผลการวิเคราะห์", paragraphs: [], bullets: [] };
      sections.push(currentSection);
    }

    if (/^[-*•]\s+/.test(line)) {
      currentSection.bullets.push(line.replace(/^[-*•]\s+/, ""));
    } else {
      currentSection.paragraphs.push(line);
    }
  });

  return sections;
}

export default function AiAnalysisSummary({ value, compact = false, showHeader = true }) {
  const sections = parseAiAnalysis(value);

  if (!sections.length) return null;

  return (
    <div className={`ai-insight-summary${compact ? " is-compact" : ""}`}>
      {showHeader ? (
        <div className="ai-insight-summary-heading">
          <span className="ai-insight-summary-icon" aria-hidden="true"><RobotOutlined /></span>
          <div>
            <span className="ai-insight-summary-kicker">AI INSIGHT</span>
            <strong>สรุปวิเคราะห์จาก AI</strong>
            <small>เรียบเรียงจากความคิดเห็นที่ผ่านการตรวจสอบแล้ว</small>
          </div>
          <span className="ai-insight-summary-status"><i /> พร้อมใช้งาน</span>
        </div>
      ) : null}

      <div className="approval-ai-analysis-preview">
        {sections.map((section, index) => (
          <section className="approval-ai-analysis-section" key={`${section.title}-${index}`}>
            <div className="approval-ai-analysis-section-heading">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h4>{section.title}</h4>
            </div>
            <div className="approval-ai-analysis-section-content">
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={`${paragraph}-${paragraphIndex}`}>{paragraph}</p>
              ))}
              {section.bullets.length ? (
                <ul>
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
