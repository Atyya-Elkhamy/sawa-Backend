// FILE: src/admin/components/ItemArrayComponent.jsx
import React from 'react';
import { Label, FormGroup, Box, Button } from '@adminjs/design-system';

const ItemArrayComponent = (props) => {
  const { property, onChange, record } = props;
  const items = record?.params?.items || [];
  console.log('ItemArrayComponent', record, property);

  const handleAdd = () => {
    const newItems = [...items, { item: '', days: 1 }];
    onChange('items', newItems);
  };

  const handleRemove = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    onChange('items', newItems);
  };

  const handleChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };
    onChange('items', newItems);
  };

  // Find the selected item's details including image
  const getSelectedItemDetails = (itemId) => {
    return property.custom?.availableValues?.find((item) => item.value === itemId);
  };

  return (
    <Box variant="white">
      <Label>Items</Label>
      {items.map((item, index) => (
        <Box key={index} className="mb-4 p-4 border rounded">
          <div className="flex gap-4">
            {/* Item Image Preview */}
            {getSelectedItemDetails(item.item)?.image && (
              <div className="w-20 h-20 flex-shrink-0">
                <img
                  src={getSelectedItemDetails(item.item).image}
                  alt={getSelectedItemDetails(item.item).label}
                  className="w-full h-full object-cover rounded"
                />
              </div>
            )}

            <div className="flex-grow">
              <FormGroup>
                <Label>Item</Label>
                <select
                  value={item.item}
                  onChange={(e) => handleChange(index, 'item', e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select Item</option>
                  {property.custom?.availableValues?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormGroup>

              <FormGroup>
                <Label>Days</Label>
                <input
                  type="number"
                  min="1"
                  value={item.days}
                  onChange={(e) => handleChange(index, 'days', parseInt(e.target.value, 10))}
                  className="w-full p-2 border rounded"
                />
              </FormGroup>
            </div>

            <Button variant="danger" onClick={() => handleRemove(index)}>
              Remove Item
            </Button>
          </div>
        </Box>
      ))}
      <Button variant="primary" onClick={handleAdd}>
        Add Item
      </Button>
    </Box>
  );
};

export default ItemArrayComponent;
