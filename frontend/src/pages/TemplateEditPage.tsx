import { useState, useMemo } from 'react';
import * as diff from 'diff';

export default function TemplateEditPage() {
  const baselineTemplate = `Dear {Name},

Thank you for your purchase of {Product}.
We hope you enjoy it.

Best,
The Team`;

  const [content, setContent] = useState(baselineTemplate);

  const diffResult = useMemo(() => {
    return diff.diffChars(baselineTemplate, content);
  }, [baselineTemplate, content]);

  return (
    <div>
      <h1 className="page-title">Edit Template</h1>
      <div className="editor-container">
        <div className="editor-pane">
          <label className="font-bold mb-2">Editor</label>
          <textarea
            className="editor-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div className="editor-pane">
          <label className="font-bold mb-2">Diff Preview</label>
          <div className="diff-pane">
            {diffResult.map((part, index) => {
              const className = part.added ? 'diff-add' : part.removed ? 'diff-remove' : '';
              return (
                <span key={index} className={className}>
                  {part.value}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <button className="btn-primary">Save Changes</button>
    </div>
  );
}
