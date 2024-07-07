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
  const [principal, setPrincipal] = useState(null);

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (actor) {
      console.log('Actor methods:', Object.keys(actor));
    }
  }, [actor]);

  useEffect(() => {
    if (actor && username) {
      registerUser();
    }
  }, [actor, username]);

  async function initAuth() {
    try {
      const authClient = await AuthClient.create();
      if (await authClient.isAuthenticated()) {
        handleAuthenticated(authClient);
      }
    } catch (error) {
      console.error('Error in initAuth:', error);
    }
  }

  async function login() {
    try {
      const authClient = await AuthClient.create();
      authClient.login({
        identityProvider: process.env.II_URL,
        onSuccess: () => handleAuthenticated(authClient),
      });
    } catch (error) {
      console.error('Error in login:', error);
    }
  }

  async function handleAuthenticated(authClient) {
    try {
      setIsAuthenticated(true);
      const identity = await authClient.getIdentity();
      const userPrincipal = identity.getPrincipal();
      console.log('User Principal:', userPrincipal.toText());
      setPrincipal(userPrincipal);
      const agent = new HttpAgent({ identity });
      await agent.fetchRootKey(); // This line is needed when working with local canisters
      const chatActor = Actor.createActor(idlFactory, {
        agent,
        canisterId: process.env.CHAT_APP_CANISTER_ID,
      });
      setActor(chatActor);
      console.log('Actor created:', !!chatActor);
    } catch (error) {
      console.error('Error in handleAuthenticated:', error);
    }
  }

  async function registerUser() {
    if (actor && username && principal) {
      try {
        await actor.registerUser(username);
        console.log('User registered successfully');
      } catch (error) {
        console.error('Error registering user:', error);
      }
    } else {
      console.error('Cannot register user: missing actor, username, or principal');
      console.log('Actor:', !!actor, 'Username:', username, 'Principal:', principal?.toText());
    }
  }

  async function sendMessage() {
    if (!actor) {
      console.error('Actor is not initialized');
      return;
    }
    if (!newMessage.trim()) {
      console.error('Message is empty');
      return;
    }
    try {
      const message = await actor.sendMessage(newMessage);
      console.log('Message sent successfully:', message);
      setMessages(prevMessages => [...prevMessages, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
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
                {messages.map((msg, index) => (
                  <div key={index}>
                    <strong>{msg.sender.toText()}: </strong>
                    {msg.content}
                  </div>
                ))}
              </div>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message"
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
