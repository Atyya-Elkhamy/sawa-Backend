# OneSignal Notification Templates Documentation

## Common Template Structure
All notification templates follow this base structure:
```javascript
{
  include_aliases: { external_id: [userId] },
  contents: { en: string, ar: string },
  headings: { en: string, ar: string },
  large_icon or chrome_web_image: string,
  data: { type: string, ...additionalData }
}
```

## Template Types

### 1. Gift Notification (`strangerGiftReceived`)
Used when a user receives a gift from another user.

```javascript
{
  include_aliases: { 
    external_id: ['userId'] 
  },
  contents: {
    en: 'You received gift from {senderName}!',
    ar: 'لقد تلقيت هدية من {senderName}!'
  },
  headings: { 
    en: 'New Gift Received',
    ar: 'تم استلام هدية جديدة'
  },
  chrome_web_image: 'https://www.sawalive.live/logo.png',
  data: {
    type: 'strangerGiftReceived',
    senderId: ObjectId,
    giftId: string,
    roomId: string | null,
    amount: number
  }
}
```

### 2. Voice Message (`newMessage`)
Used for voice message notifications.

```javascript
{
  include_aliases: { 
    external_id: ['userId'] 
  },
  contents: {
    en: 'New voice message',
    ar: 'رسالة صوتية جديدة'
  },
  headings: {
    en: 'New message from {senderName}',
    ar: 'رسالة جديدة من {senderName}'
  },
  large_icon: '{senderAvatar}',
  data: {
    type: 'newMessage',
    senderId: string,
    conversationId: string,
    messageType: 'voice'
  }
}
```

### 3. Text Message (`newMessage`)
Used for regular text message notifications.

```javascript
{
  include_aliases: { 
    external_id: ['userId'] 
  },
  contents: {
    en: '{messageText}',
    ar: '{messageText}'
  },
  headings: {
    en: 'New message from {senderName}',
    ar: 'رسالة جديدة من {senderName}'
  },
  large_icon: '{senderAvatar}',
  data: {
    type: 'newMessage',
    senderId: string,
    conversationId: string,
    messageType: 'text'
  }
}
```

### 4. New Follower (`newFollower`)
Used when a user gains a new follower.

```javascript
{
  include_aliases: { 
    external_id: ['userId'] 
  },
  contents: {
    en: '{followerName} started following you!',
    ar: '{followerName} بدأ بمتابعتك!'
  },
  headings: { 
    en: 'New Follower',
    ar: 'متابع جديد'
  },
  large_icon: '{followerAvatar}',
  data: {
    type: 'newFollower',
    followerId: string
  }
}
```

### 5. System Message (`SystemMessage-individual`)
Used for individual system messages.

```javascript
{
  include_aliases: { 
    external_id: ['userId'] 
  },
  contents: {
    en: '{systemMessage}',
    ar: '{systemMessage}'
  },
  headings: { 
    en: 'System Message',
    ar: 'رسالة من النظام'
  },
  chrome_web_image: 'https://www.sawalive.live/logo.png',
  data: {
    type: 'SystemMessage-individual'
  }
}
```
