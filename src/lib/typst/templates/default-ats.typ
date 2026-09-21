// ============================================================================
// ATS-safe CV template (Job Match ATS Piper — default)
// ============================================================================
// Compatibility rules enforced here — keep them when customizing, or the
// PDF's text may stop being reliably machine-readable by ATS parsers:
//   1. Single column only. Multi-column layouts scramble reading order when
//      an ATS extracts raw text top-to-bottom.
//   2. No tables/grids for multi-row content (skills matrices, etc). Cell
//      reading order in extracted table text is unreliable across parsers.
//   3. No text-in-images, icon-glyphs standing in for words, or absolute
//      positioning for content that must be read — plain paragraphs/lists
//      keep Typst's real, selectable embedded text parseable.
//   4. Section headers are plain text ("EXPERIENCIA"), never icon glyphs.
//   5. No running page headers/footers — many ATS parsers skip them
//      entirely, so nothing load-bearing goes there.
//   6. Contact info is plain body text, not a sidebar box or image.
//
// Input contract (sys.inputs.cv_data, JSON — see src/lib/cv/generate.ts):
// {
//   personal: { fullName, email, phone?, location?, linkedin?, website? },
//   summary: string,                              // already tailored
//   experience: [{ company, role, location?, startDate, endDate, bullets }],
//   education: [{ institution, degree, startDate, endDate }],
//   skills: string[],                              // includes emphasized keywords
//   languages: [{ name, level }],
// }
// endDate is `none` for "current" entries.
// ============================================================================

#let data = json.decode(bytes(sys.inputs.cv_data))

#set page(paper: "a4", margin: (x: 1.8cm, y: 1.6cm))
#set text(size: 10.5pt, lang: "es")
#set par(justify: false, leading: 0.55em)

#let section(title) = [
  #v(0.5em)
  #text(size: 11pt, weight: "bold", tracking: 0.5pt)[#upper(title)]
  #line(length: 100%, stroke: 0.5pt)
  #v(0.25em)
]

#let dateRange(start, end) = {
  if end == none { start + " -- Actualidad" } else { start + " -- " + end }
}

// --- Header: plain text, no image/box, always parseable ---
#align(center)[
  #text(size: 18pt, weight: "bold")[#data.personal.fullName]
  #v(0.15em)
  #text(size: 9.5pt)[
    #data.personal.email
    #if "phone" in data.personal { [ · #data.personal.phone] }
    #if "location" in data.personal { [ · #data.personal.location] }
    #if "linkedin" in data.personal { [ · #data.personal.linkedin] }
  ]
]

#section("Resumen profesional")
#data.summary

#section("Experiencia")
#for exp in data.experience [
  #text(weight: "bold")[#exp.role] --- #text(style: "italic")[#exp.company] #text(size: 9pt)[(#dateRange(exp.startDate, exp.endDate))]
  #if "location" in exp [
    #linebreak()
    #text(size: 9pt)[#exp.location]
  ]
  #list(..exp.bullets.map(b => [#b]))
  #v(0.35em)
]

#section("Educación")
#for edu in data.education [
  #text(weight: "bold")[#edu.degree] --- #edu.institution #text(size: 9pt)[(#dateRange(edu.startDate, edu.endDate))]
  #v(0.2em)
]

#section("Habilidades")
#data.skills.join(" · ")

#if data.languages.len() > 0 [
  #section("Idiomas")
  #data.languages.map(l => l.name + " (" + l.level + ")").join(" · ")
]
