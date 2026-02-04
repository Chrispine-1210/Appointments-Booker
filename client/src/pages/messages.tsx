import { useState } from "react";
import Navigation from "@/components/navigation";

export default function Messages() {
  const [selectedConversation, setSelectedConversation] = useState<number>(1);
  const [messageText, setMessageText] = useState("");

  const conversations = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      lastMessage: "Looking forward to seeing you tomorrow!",
      timestamp: "2 hours ago",
      unread: 1,
      avatar: "SJ",
    },
    {
      id: 2,
      name: "Mike's Fitness Studio",
      lastMessage: "Your membership renewal is coming up...",
      timestamp: "Yesterday",
      unread: 0,
      avatar: "MF",
    },
    {
      id: 3,
      name: "Dr. Robert Chen",
      lastMessage: "Thank you for your review! 5 stars",
      timestamp: "3 days ago",
      unread: 0,
      avatar: "RC",
    },
  ];

  const messages = [
    { id: 1, sender: "Dr. Sarah Johnson", text: "Hi! Just confirming your appointment tomorrow at 2 PM", timestamp: "10:30 AM" },
    { id: 2, sender: "You", text: "Yes, confirmed! See you then", timestamp: "10:32 AM" },
    { id: 3, sender: "Dr. Sarah Johnson", text: "Perfect! Please arrive 5 minutes early", timestamp: "10:35 AM" },
    { id: 4, sender: "Dr. Sarah Johnson", text: "Looking forward to seeing you tomorrow!", timestamp: "10:36 AM" },
  ];

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-slate-800 mb-8">Messages</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-96">
          {/* Conversations List */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <div className="overflow-y-auto max-h-96">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`w-full p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left ${
                    selectedConversation === conv.id ? 'bg-blue-50 border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {conv.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{conv.name}</p>
                      <p className="text-xs text-slate-600 truncate">{conv.lastMessage}</p>
                      <p className="text-xs text-slate-500 mt-1">{conv.timestamp}</p>
                    </div>
                    {conv.unread > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="md:col-span-2 bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-primary to-blue-600 text-white">
              <h2 className="font-bold text-lg">{selectedConv?.name}</h2>
              <p className="text-sm text-blue-100">Active now</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === "You" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.sender === "You" 
                      ? "bg-primary text-white rounded-br-none" 
                      : "bg-slate-100 text-slate-800 rounded-bl-none"
                  }`}>
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === "You" ? "text-blue-100" : "text-slate-600"}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="input-message"
                />
                <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-secondary transition-colors font-medium">
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
