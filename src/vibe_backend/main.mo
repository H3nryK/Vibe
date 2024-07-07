import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";
import Array "mo:base/Array";
import Option "mo:base/Option";
import Debug "mo:base/Debug";
import Error "mo:base/Error";

actor ChatApp {
    type Message = {
        id: Nat;
        sender: Principal;
        content: Text;
        timestamp: Int;
    };

    type User = {
        id: Principal;
        username: Text;
    };

    private stable var messagesEntries: [(Nat, Message)] = [];
    private stable var usersEntries: [(Principal, User)] = [];
    private stable var nextMessageId: Nat = 0;

    private var messages = Buffer.Buffer<Message>(0);
    private var users = Buffer.Buffer<User>(0);

    system func preupgrade() {
        messagesEntries := Array.map<Message, (Nat, Message)>(
            Buffer.toArray(messages),
            func (msg: Message): (Nat, Message) { (msg.id, msg) }
        );
        usersEntries := Array.map<User, (Principal, User)>(
            Buffer.toArray(users),
            func (user: User): (Principal, User) { (user.id, user) }
        );
    };

    system func postupgrade() {
        messages := Buffer.fromArray<Message>(
            Array.map<(Nat, Message), Message>(
                messagesEntries,
                func ((_, msg): (Nat, Message)): Message { msg }
            )
        );
        users := Buffer.fromArray<User>(
            Array.map<(Principal, User), User>(
                usersEntries,
                func ((_, user): (Principal, User)): User { user }
            )
        );
        messagesEntries := [];
        usersEntries := [];
    };

    public shared(msg) func registerUser(username: Text) : async User {
        let caller = msg.caller;
        Debug.print("Registering user with principal: " # Principal.toText(caller));
        let user : User = {
            id = caller;
            username = username;
        };
        users.add(user);
        user
    };

    public query func getUsers() : async [User] {
        Buffer.toArray(users)
    };

   public shared(msg) func sendMessage(content: Text) : async Message {
        let caller = msg.caller;
        Debug.print("Sending message from principal: " # Principal.toText(caller));
        let senderUsername = getUsernameByPrincipal(caller);
        
        switch (senderUsername) {
            case (null) {
                Debug.print("User not found for principal: " # Principal.toText(caller));
                throw Error.reject("User not registered");
            };
            case (?username) {
                let message : Message = {
                    id = nextMessageId;
                    sender = caller;
                    content = content;
                    timestamp = Time.now();
                };
                messages.add(message);
                nextMessageId += 1;
                Debug.print("Message sent successfully");
                message
            };
        };
    };

    public shared(msg) func deleteMessage(id: Nat) : async Bool {
        let caller = msg.caller;
        let index = Array.indexOf<Message>(
            {
                id = id;
                sender = caller;
                content = "";
                timestamp = 0;
            },
            Buffer.toArray(messages),
            func(a: Message, b: Message): Bool { a.id == b.id and a.sender == b.sender }
        );

        switch (index) {
            case (?i) {
                ignore messages.remove(i);
                true
            };
            case (null) { false };
        }
    };

    private func getUsernameByPrincipal(principal: Principal) : ?Text {
        Debug.print("Looking up username for principal: " # Principal.toText(principal));
        Option.map<User, Text>(
            Array.find<User>(
                Buffer.toArray(users),
                func(user: User): Bool { 
                    Debug.print("Comparing with user: " # Principal.toText(user.id));
                    Principal.equal(user.id, principal) 
                }
            ),
            func (user : User) : Text { user.username }
        )
    };
}