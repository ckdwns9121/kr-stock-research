"use client";

import { useState } from "react";

interface TabsProps {
  tabs: { label: string; value: string }[];
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export function Tabs({ tabs, defaultValue, onChange }: TabsProps) {
  const [active, setActive] = useState(defaultValue ?? tabs[0]?.value);

  return (
    <div className="flex gap-1 bg-toss-gray-100 rounded-xl p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => {
            setActive(tab.value);
            onChange?.(tab.value);
          }}
          className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            active === tab.value
              ? "bg-white text-toss-gray-900 shadow-sm"
              : "text-toss-gray-500 hover:text-toss-gray-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
