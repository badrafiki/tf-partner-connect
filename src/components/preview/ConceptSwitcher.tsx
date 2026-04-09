import { useNavigate, useLocation } from "react-router-dom";

const concepts = [
  { num: 1, path: "/preview/catalog-1", label: "Clean Table" },
  { num: 2, path: "/preview/catalog-2", label: "Card Grid" },
  { num: 3, path: "/preview/catalog-3", label: "Split Panel" },
  { num: 4, path: "/preview/catalog-4", label: "Command Palette" },
];

export function ConceptSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1B3A6B] text-white rounded-full shadow-2xl flex items-center gap-0.5 p-1.5">
      {concepts.map((c) => {
        const active = location.pathname === c.path;
        return (
          <button
            key={c.num}
            onClick={() => navigate(c.path)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              active
                ? "bg-white text-[#1B3A6B] shadow-md"
                : "text-white/80 hover:text-white hover:bg-white/15"
            }`}
          >
            <span className="hidden sm:inline">{c.label}</span>
            <span className="sm:hidden">{c.num}</span>
          </button>
        );
      })}
    </div>
  );
}
