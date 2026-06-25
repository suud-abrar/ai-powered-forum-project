export const CitationLink = ({ citation, onCitationClick }) => {
  const handleClick = (e) => {
    e.preventDefault();
    if (onCitationClick) {
      onCitationClick(citation);
    } else {
      // Fallback: navigate to the post
      window.location.hash = `#post-${citation.id}`;
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline text-sm ml-1"
      title={`${citation.type}: ${citation.title || citation.snippet}`}
    >
      <span>[{citation.id.slice(0, 8)}]</span>
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M11 3a1 1 0 100 2h3.586L9.293 9.293a1 1 0 001.414 1.414L16 6.414V10a1 1 0 102 0V4a1 1 0 00-1-1h-6z" />
      </svg>
    </button>
  );
};
