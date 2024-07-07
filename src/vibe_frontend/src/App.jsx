import React, { useState, useEffect } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from '../../declarations/vibe_backend';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [actor, setActor] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    initAuth();
  }, []);

  async function initAuth() {
    const authClient = await AuthClient.create();
    if (await authClient.isAuthenticated()) {
      handleAuthenticated(authClient);
    }
  }

  async function login() {
    const authClient = await AuthClient.create();
    authClient.login({
      identityProvider: process.env.II_URL,
      onSuccess: () => handleAuthenticated(authClient),
    });
  }

  async function handleAuthenticated(authClient) {
    setIsAuthenticated(true);
    const identity = await authClient.getIdentity();
    const agent = new HttpAgent({ identity });
    const chatActor = Actor.createActor(idlFactory, {
      agent,
      canisterId: process.env.CHAT_APP_CANISTER_ID,
    });
    setActor(chatActor);
  }

  async function registerUser() {
    if (actor && username) {
      try {
        await actor.registerUser(username);
        // Optionally, you can fetch and display all users here
      } catch (error) {
        console.error('Error registering user:', error);
      }
    }
  }

  async function sendMessage() {
    if (actor && newMessage) {
      try {
        const message = await actor.sendMessage(newMessage);
        setMessages([...messages, message]);
        setNewMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }

  return (
    <div className="App">
      <h1>Chat App</h1>
      {!isAuthenticated ? (
        <button onClick={login}>Login with Internet Identity</button>
      ) : (
        <>
          {!username ? (
            <div>
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <button onClick={registerUser}>Register</button>
            </div>
          ) : (
            <div>
              <div>
                {messages.map((msg) => (
                  <div key={msg.id}>
                    <strong>{msg.sender}: </strong>
                    {msg.content}
                  </div>
                ))}
              </div>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;