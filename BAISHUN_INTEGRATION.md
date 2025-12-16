# BAISHUN Games Integration

This document explains the BAISHUN games integration implementation for the Sawa Sawa platform.

## Overview

BAISHUN is a game provider that requires specific API endpoints to integrate their games with our platform. The integration follows their authentication protocol and provides the necessary endpoints for user management and currency transactions.

## Configuration

The integration uses the following environment variables:

```env
# BAISHUN Game Config
APP_CHANNEL=sawa_sawa
APP_ID=8519456384
APP_KEY=2VuLmFaUkrG6L3mbXtHRHlgO49ZPQtVX
```

## Authentication

BAISHUN uses a signature-based authentication system:

1. **Signature Algorithm**: `md5(signature_nonce + app_key + timestamp)`
2. **Signature Validity**: 15 seconds
3. **Nonce Requirement**: Globally unique within 15 seconds to prevent replay attacks

## API Endpoints

All endpoints are prefixed with `/v1/baishun-games/`

### 1. Health Check
- **Endpoint**: `GET /v1/baishun-games/health`
- **Purpose**: Check integration status
- **Authentication**: None required

### 2. Get SS Token
- **Endpoint**: `POST /v1/baishun-games/get-sstoken`
- **Purpose**: Exchange temporary code for long-term token
- **Required Parameters**:
  - `app_id`: Application ID
  - `user_id`: Player ID
  - `code`: Temporary code (one-time use)
  - `signature_nonce`: Random string
  - `timestamp`: Request timestamp
  - `signature`: Request signature

**Response Example**:
```json
{
  "code": 0,
  "message": "succeed",
  "unique_id": "1682674739807011000",
  "data": {
    "ss_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
    "expire_date": 1671096189000
  }
}
```

### 3. Get User Info
- **Endpoint**: `POST /v1/baishun-games/get-user-info`
- **Purpose**: Retrieve user information for games
- **Required Parameters**:
  - `app_id`: Application ID
  - `user_id`: Player ID
  - `ss_token`: SS token from get-sstoken
  - `client_ip`: Client IP address
  - `game_id`: Game ID
  - Authentication parameters

**Response Example**:
```json
{
  "code": 0,
  "message": "succeed",
  "unique_id": "1603289980002643968",
  "data": {
    "user_id": "user123",
    "user_name": "John Doe",
    "user_avatar": "https://example.com/avatar.jpg",
    "balance": 1000,
    "user_type": 1,
    "release_cond": 0
  }
}
```

### 4. Update SS Token
- **Endpoint**: `POST /v1/baishun-games/update-sstoken`
- **Purpose**: Refresh an existing SS token
- **Required Parameters**:
  - `app_id`: Application ID
  - `user_id`: Player ID
  - `ss_token`: Current SS token
  - Authentication parameters

### 5. Change Balance
- **Endpoint**: `POST /v1/baishun-games/change-balance`
- **Purpose**: Handle game currency transactions
- **Required Parameters**:
  - `app_id`: Application ID
  - `user_id`: Player ID
  - `ss_token`: SS token
  - `currency_diff`: Amount to change (negative for deduction, positive for addition)
  - `diff_msg`: Transaction type (`bet`, `result`, `refund`, `buyin`, `buyout`)
  - `game_id`: Game ID
  - `room_id`: Room ID
  - `change_time_at`: Transaction timestamp
  - `order_id`: Unique order ID
  - Authentication parameters

**Important Notes**:
- Error code `1008` indicates insufficient balance
- Duplicate `order_id` handling prevents double processing
- Currency transactions are protected against concurrency issues

## Implementation Details

### Database Models

1. **BaishunToken Model** (`/src/models/games/baishun.token.model.js`):
   - Stores SS tokens and their metadata
   - Tracks game transactions to prevent duplicates
   - Handles token expiration and validation

### Services

1. **Baishun Service** (`/src/services/baishun.service.js`):
   - Core business logic for BAISHUN integration
   - Token management
   - User information retrieval
   - Balance change processing

### Middleware

1. **Baishun Auth Middleware** (`/src/middlewares/baishunAuth.js`):
   - Signature validation
   - Timestamp checking
   - Nonce verification
   - Response signature generation

### Controllers

1. **Baishun Controller** (`/src/controllers/baishun.controller.js`):
   - HTTP request handling
   - Response formatting
   - Error handling

## Security Features

1. **Signature Validation**: All requests must have valid signatures
2. **Timestamp Validation**: Requests expire after 15 seconds
3. **Nonce Validation**: Prevents replay attacks
4. **Token Expiration**: SS tokens have 30-day expiration
5. **Duplicate Prevention**: Order IDs are tracked to prevent double processing

## Error Codes

- `0`: Success
- `400`: Bad request
- `401`: Unauthorized (invalid signature/token)
- `404`: User not found
- `500`: Internal server error
- `1001`: Code already used (BAISHUN specific)
- `1008`: Insufficient balance (BAISHUN specific)

## Testing

Run the test script to verify the integration:

```bash
node test-baishun-integration.js
```

The test script will:
1. Check health endpoint
2. Test SS token generation
3. Test user info retrieval
4. Test balance changes

## Integration with Existing System

The BAISHUN integration seamlessly works with the existing Sawa Sawa system:

- **User Model**: Uses existing `User` model and `credits` field for game currency
- **Balance Management**: Integrates with existing `userService` for balance operations
- **Transaction Logging**: Uses existing `logWalletTransaction` system
- **Real-time Updates**: Sends balance change notifications to users

## Monitoring and Logging

All BAISHUN operations are logged with appropriate log levels:
- Info: Successful operations
- Error: Failed operations with details
- Debug: Request/response details for troubleshooting

## Production Considerations

1. **Rate Limiting**: Consider adding rate limiting for BAISHUN endpoints
2. **Monitoring**: Set up alerts for failed authentication attempts
3. **Database Indexing**: Ensure proper indexes on BaishunToken model
4. **Caching**: Consider caching user info for frequently accessed data
5. **Backup Strategy**: Include BaishunToken collection in backup procedures

## Troubleshooting

Common issues and solutions:

1. **Invalid Signature**: Check APP_KEY configuration and signature generation
2. **Token Expired**: Implement automatic token refresh in frontend
3. **Insufficient Balance**: Handle gracefully in game UI
4. **Duplicate Orders**: System automatically handles this scenario

## API Documentation

Full Swagger documentation is available at `/docs` endpoint when running in development mode.
