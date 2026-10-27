import { useState } from 'react';
import type { QueryValue, RouteInfo } from '@/types/api';
import { describeRouteParams } from '@/api/schemas';

export interface ApiRequestBuilderProps {
  route?: RouteInfo;
  params: Record<string, QueryValue>;
  onChange: (params: Record<string, QueryValue>) => void;
}

const COMMON_PARAM_ORDER = [
  'search',
  'slug',
  'author',
  'status',
  'order',
  'orderby',
  'before',
  'after',
  'categories',
  'categories_exclude',
  'tags',
  'tags_exclude',
  'include',
  'exclude',
  '_embed',
  '_fields',
];

export function ApiRequestBuilder({ route, params, onChange }: ApiRequestBuilderProps) {
  const [advancedKey, setAdvancedKey] = useState('');
  const [advancedValue, setAdvancedValue] = useState('');

  const paramDocs = route ? describeRouteParams(route, 'GET') : [];
  const knownNames = new Set(paramDocs.map((p) => p.name));
  const availableCommon = COMMON_PARAM_ORDER.filter((name) => knownNames.has(name));

  function setParam(name: string, value: QueryValue) {
    onChange({ ...params, [name]: value === '' || value === undefined ? undefined : value });
  }

  function addAdvancedParam() {
    if (!advancedKey.trim()) return;
    setParam(advancedKey.trim(), advancedValue);
    setAdvancedKey('');
    setAdvancedValue('');
  }

  return (
    <div className="request-builder">
      <div className="request-builder-grid">
        {availableCommon.map((name) => {
          const doc = paramDocs.find((p) => p.name === name);
          const value = params[name];
          if (doc?.enumValues?.length) {
            return (
              <label key={name} className="request-field">
                <span>{name}</span>
                <select value={value === undefined ? '' : String(value)} onChange={(e) => setParam(name, e.target.value || undefined)}>
                  <option value="">any</option>
                  {doc.enumValues.map((option) => (
                    <option key={String(option)} value={String(option)}>
                      {String(option)}
                    </option>
                  ))}
                </select>
              </label>
            );
          }
          if (name === '_embed') {
            return (
              <label key={name} className="request-field request-field-checkbox">
                <input type="checkbox" checked={!!value} onChange={(e) => setParam(name, e.target.checked ? 1 : undefined)} />
                <span>_embed</span>
              </label>
            );
          }
          return (
            <label key={name} className="request-field" title={doc?.description}>
              <span>{name}</span>
              <input
                type="text"
                value={value === undefined ? '' : String(value)}
                onChange={(e) => setParam(name, e.target.value)}
                placeholder={doc?.default !== undefined ? String(doc.default) : ''}
              />
            </label>
          );
        })}
      </div>

      <details className="request-builder-advanced">
        <summary>Advanced: raw query parameter</summary>
        <div className="advanced-row">
          <input placeholder="param name" value={advancedKey} onChange={(e) => setAdvancedKey(e.target.value)} />
          <input placeholder="value" value={advancedValue} onChange={(e) => setAdvancedValue(e.target.value)} />
          <button onClick={addAdvancedParam}>Add</button>
        </div>
        {Object.entries(params)
          .filter(([key, value]) => value !== undefined && !COMMON_PARAM_ORDER.includes(key) && key !== 'page' && key !== 'per_page')
          .map(([key, value]) => (
            <div className="advanced-row" key={key}>
              <code>{key}</code>
              <span>{String(value)}</span>
              <button onClick={() => setParam(key, undefined)}>Remove</button>
            </div>
          ))}
      </details>
    </div>
  );
}
