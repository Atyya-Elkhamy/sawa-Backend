db.users.updateMany(
    {}, // Empty filter to match all documents
    {
        $set: {
            group: null,
        },
    }
);

// dekete all group members
db.groupMembers.deleteMany({});
