"use client";

import React from "react";

interface TimePickerProps {
  value: number; // seconds
  onChange: (seconds: number) => void;
  label?: string;
}

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;

  const update = (h: number, m: number, s: number) => {
    const clampedM = Math.min(59, Math.max(0, m));
    const clampedS = Math.min(59, Math.max(0, s));
    const total = Math.max(0, h * 3600 + clampedM * 60 + clampedS);
    onChange(total);
  };

  return (
    <div>
      {label && <label className="block mb-1 text-sm">{label}</label>}
      <div className="flex items-center space-x-2">
        <input
          type="number"
          min={0}
          value={hours}
          onChange={(e) => update(Number(e.target.value), minutes, seconds)}
          className="w-16 p-2 text-center rounded border border-gray-600 bg-gray-800"
          aria-label="Hours"
        />
        <span className="text-gray-400">h</span>

        <input
          type="number"
          min={0}
          max={59}
          value={minutes}
          onChange={(e) => update(hours, Number(e.target.value), seconds)}
          className="w-16 p-2 text-center rounded border border-gray-600 bg-gray-800"
          aria-label="Minutes"
        />
        <span className="text-gray-400">m</span>

        <input
          type="number"
          min={0}
          max={59}
          value={seconds}
          onChange={(e) => update(hours, minutes, Number(e.target.value))}
          className="w-16 p-2 text-center rounded border border-gray-600 bg-gray-800"
          aria-label="Seconds"
        />
        <span className="text-gray-400">s</span>
      </div>
    </div>
  );
}
