import React from "react";

export const Table = ({ children }) => <table className="w-full border">{children}</table>;
export const TableHeader = ({ children }) => <thead className="bg-gray-200">{children}</thead>;
export const TableBody = ({ children }) => <tbody>{children}</tbody>;
export const TableRow = ({ children }) => <tr className="border-b">{children}</tr>;
export const TableCell = ({ children }) => <td className="p-2 border">{children}</td>;
