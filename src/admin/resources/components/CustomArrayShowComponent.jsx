// FILE: src/admin/components/CustomArrayShowComponent.jsx

import React from 'react';

const CustomArrayShowComponent = (props) => {
  const { record, property } = props;

  // Get the array value (items or gifts)
  const arrayValue = record.params[property.name];

  if (!arrayValue || !Array.isArray(arrayValue)) {
    return <span>No data</span>;
  }

  return (
    <div>
      {arrayValue.map((item, index) => (
        <div key={index} style={{ marginBottom: '10px' }}>
          <strong>Item {index + 1}:</strong>
          <ul>
            {Object.entries(item).map(([key, value]) => (
              <li key={key}>
                <strong>{key}:</strong> {JSON.stringify(value)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default CustomArrayShowComponent;
