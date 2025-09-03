
import React, { useState } from 'react';
import { Clipboard, Check } from 'lucide-react';

interface CodeBlockProps {
  script: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ script }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(script).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg relative">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-800 rounded-t-lg">
        <span className="text-xs font-mono text-gray-400">Code.gs</span>
        <button
          onClick={handleCopy}
          className="flex items-center text-xs text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
        >
          {copied ? <Check className="w-4 h-4 mr-1 text-green-400" /> : <Clipboard className="w-4 h-4 mr-1" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-sm text-white overflow-x-auto max-h-[500px]">
        <code>{script}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;
