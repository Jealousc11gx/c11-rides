import content from './content.json'
import ScrollVideo from './components/ScrollVideo'
import SplitText from './components/SplitText'
import StarBorder from './components/StarBorder'

function SectionMarker({ number, label }) {
  return (
    <span className="scroll-video__section-marker">
      <b>{number}</b><span>{label}</span>
    </span>
  )
}

function App() {
  const { sections } = content

  return (
    <main>
      <ScrollVideo
        identity={content.identity}
        videoSrc="/web_vedio.mp4"
        frameManifest="/frames/web_vedio/manifest.json"
        decodeFps={24}
        maxFrameWidth={1280}
        frameQuality={0.72}
        startTime={0.35}
        contactCard={content.contactCard}
        navItems={content.navItems}
        scrollCue={content.scrollCue}
        texts={[
          {
            id: 'profile',
            time: 2.4,
            hold: 1.15,
            content: (
              <>
                <SectionMarker
                  number={sections.profile.markerNumber}
                  label={sections.profile.markerLabel}
                />
                <SplitText className="scroll-video__section-title" text={sections.profile.title} />
                <p className="scroll-video__profile-role">{sections.profile.role}</p>
                <div className="scroll-video__profile-stack">
                  {sections.profile.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <small>{sections.profile.summary}</small>
              </>
            ),
            style: { left: '30%', top: '48%', textAlign: 'left', justifyItems: 'start' },
          },
          {
            id: 'publications',
            time: 4.8,
            hold: 1.15,
            content: (
              <>
                <SectionMarker
                  number={sections.publications.markerNumber}
                  label={sections.publications.markerLabel}
                />
                <SplitText className="scroll-video__section-title" text={sections.publications.title} />
                <div className="scroll-video__paper-list">
                  {sections.publications.items.map((item) => (
                    <p key={item.number}>
                      <b>{item.number}</b><span>{item.text}</span>
                    </p>
                  ))}
                </div>
              </>
            ),
            style: { left: '68%', top: '38%', textAlign: 'right', justifyItems: 'end' },
          },
          {
            id: 'projects',
            time: 6.6,
            end: 7.3,
            hold: 1.1,
            content: (
              <>
                <SectionMarker
                  number={sections.projects.markerNumber}
                  label={sections.projects.markerLabel}
                />
                <SplitText className="scroll-video__section-title" text={sections.projects.title} />
                <div className="scroll-video__project-list">
                  {sections.projects.items.map((item) => (
                    <p key={item.label}>
                      <b>{item.label}</b><span>{item.text}</span>
                    </p>
                  ))}
                </div>
                <small>{sections.projects.summary}</small>
              </>
            ),
            style: { left: '31%', top: '64%', textAlign: 'left', justifyItems: 'start' },
          },
          {
            id: 'links',
            time: 8.2,
            hold: 1.4,
            content: (
              <>
                <SectionMarker
                  number={sections.links.markerNumber}
                  label={sections.links.markerLabel}
                />
                <SplitText
                  className="scroll-video__quote scroll-video__quote--animated"
                  mode="words"
                  stagger={78}
                  text={sections.links.quote}
                />
                <nav className="scroll-video__links" aria-label={sections.links.ariaLabel}>
                  {sections.links.items.map((link, index) => (
                    <StarBorder
                      as="a"
                      className={`scroll-video__link${index === 0 ? ' scroll-video__link--github' : ''}`}
                      color="white"
                      href={link.href}
                      key={link.label}
                      rel={link.rel}
                      speed={link.speed}
                      style={{ '--link-index': index }}
                      target={link.target}
                      thickness={1}
                    >
                      {link.label}
                    </StarBorder>
                  ))}
                </nav>
              </>
            ),
            style: {
              left: '50%',
              maxWidth: 'calc(100vw - 48px)',
              textAlign: 'center',
              top: '54%',
              width: 'min(1100px, calc(100vw - 48px))',
            },
          },
        ]}
      />
    </main>
  )
}

export default App
