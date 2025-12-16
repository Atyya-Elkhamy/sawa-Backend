import React from 'react';
import { FormGroup, Label, Button, Box, Text } from '@adminjs/design-system';
const GiftArrayComponent = ({ property, record, onChange }) => {
  console.log('GiftArrayComponent', record, property);

  const gifts = record.params.gifts || [];
  console.log('GiftArrayComponent', record, property);

  const handleAdd = () => {
    onChange('gifts', [...gifts, { gift: '', quantity: 1 }]);
  };

  const handleRemove = (index) => {
    const newGifts = [...gifts];
    newGifts.splice(index, 1);
    onChange('gifts', newGifts);
  };

  const handleGiftChange = (index, field, value) => {
    const newGifts = [...gifts];
    newGifts[index] = { ...newGifts[index], [field]: value };
    onChange('gifts', newGifts);
  };

  return (
    <FormGroup>
      {/* <Label>{translateProperty(property.label)}</Label> */}
      <Box>
        {gifts.map((gift, index) => (
          <Box key={index} className="flex gap-4 items-center mb-4 p-4 border rounded">
            <div className="flex-grow">
              <FormGroup>
                <Label>Gift</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={gift.gift}
                  onChange={(e) => handleGiftChange(index, 'gift', e.target.value)}
                >
                  <option value="">Select Gift</option>
                  {property.availableValues?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormGroup>
              <FormGroup>
                <Label>Quantity</Label>
                <input
                  type="number"
                  className="w-full p-2 border rounded"
                  value={gift.quantity}
                  min="1"
                  onChange={(e) => handleGiftChange(index, 'quantity', parseInt(e.target.value))}
                />
              </FormGroup>
            </div>
            <Button variant="danger" onClick={() => handleRemove(index)}>
              Remove
            </Button>
          </Box>
        ))}
        <Button onClick={handleAdd}>Add Gift</Button>
      </Box>
    </FormGroup>
  );
};

export default GiftArrayComponent;
