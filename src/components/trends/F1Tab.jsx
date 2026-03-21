import F1DataSection from './F1DataSection';
import KeywordMonitor from './KeywordMonitor';

export default function F1Tab() {
  return (
    <div className="space-y-8">
      <F1DataSection />
      <KeywordMonitor
        category="f1"
        title="F1 / 해외 모터스포츠 모니터링"
        accentColor="red"
      />
    </div>
  );
}
