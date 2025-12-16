// FILE: src/admin/components/UploadShowComponent/UploadShowComponent.jsx

import React, { useState } from 'react';
import { Box, Label, Modal, Button } from '@adminjs/design-system';

const UploadShowComponent = (props) => {
  const { property, record } = props;
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Toggle modal visibility
  const toggleModal = () => {
    setIsModalOpen((prev) => !prev);
  };

  const imageUrl = record.params[property.name];
  console.log('imageUrl', imageUrl);
  console.log('record', record);
  console.log('property', record.params);

  return (
    <Box>
      {/* <Label>{property.label}</Label> */}
      {imageUrl && (
        <>
          <Box mt="lg">
            {/* Clickable thumbnail */}
            <img
              src={imageUrl}
              alt="Uploaded"
              style={{ maxWidth: 'auto', maxHeight: '150px', cursor: 'pointer' }}
              onClick={toggleModal}
            />
          </Box>

          {/* Modal for full-size image preview */}
          {isModalOpen && (
            <Modal isOpen={isModalOpen} onClose={toggleModal} title="Image Preview">
              <Box p="lg" display="flex" justifyContent="center">
                <img src={imageUrl} alt="Uploaded" style={{ maxWidth: '100%', maxHeight: '80vh' }} />
              </Box>
              <Box p="lg" display="flex" justifyContent="center">
                <Button onClick={toggleModal}>Close</Button>
              </Box>
            </Modal>
          )}
        </>
      )}
    </Box>
  );
};

export default UploadShowComponent;
