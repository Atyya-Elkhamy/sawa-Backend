import React from 'react';
import { Box, Text, Badge } from '@adminjs/design-system';

const ParticipantsDisplay = (props) => {
  const { record, property } = props;
  
  // AdminJS flattens the participants array into separate keys like participants.0, participants.1, etc.
  // Let's reconstruct the participants array from the flattened structure
  const params = record?.params || {};
  const participants = [];
  
  // Look for participants.0, participants.1, etc. in the params
  let index = 0;
  while (params[`participants.${index}._id`] || params[`participants.${index}.name`]) {
    const participant = {
      _id: params[`participants.${index}._id`],
      name: params[`participants.${index}.name`],
      username: params[`participants.${index}.username`],
    };
    participants.push(participant);
    index++;
  }
  
  console.log('ParticipantsDisplay - Reconstructed participants:', participants);

  if (!participants || participants.length === 0) {
    return (
      <Text variant="body2" color="muted">
        لا يوجد مشاركون
      </Text>
    );
  }

  // Now we have a proper participants array with populated data
  return (
    <Box display="flex" flexWrap="wrap" gap="xs">
      {participants.slice(0, 2).map((participant, index) => {
        const displayName = participant.name || participant.username || `مشارك ${index + 1}`;
        
        return (
          <Badge 
            key={participant._id || index}
            variant="primary"
            size="sm"
          >
            {displayName}
          </Badge>
        );
      })}
      {participants.length > 2 && (
        <Badge variant="default" size="sm">
          +{participants.length - 2} آخرين
        </Badge>
      )}
    </Box>
  );
};

export default ParticipantsDisplay;
