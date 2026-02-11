import React from "react";

export const Input = ({ value, onChange, type = "text" }) => {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      className="border px-2 py-1 rounded w-full"
    />
  );
};
