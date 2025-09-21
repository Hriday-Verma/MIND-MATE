import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// --- Constants ---
const MOODS = {
  happy: { emoji: '😊', label: 'Happy', color: '#4CAF50' },
  calm: { emoji: '😌', label: 'Calm', color: '#64B5F6' },
  neutral: { emoji: '😐', label: 'Neutral', color: '#FFC107' },
  sad: { emoji: '😢', label: 'Sad', color: '#757575' },
  anxious: { emoji: '😟', label: 'Anxious', color: '#FF7043' },
  angry: { emoji: '😠', label: 'Angry', color: '#F44336' },
};

const formatDate = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- Main App Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  
  // Centralized state for session data
  const [journalEntries, setJournalEntries] = useState([]);
  const [moodHistory, setMoodHistory] = useState([]);

  const addJournalEntry = (entry) => {
      setJournalEntries(prev => [entry, ...prev]);
  };

  const addMoodLog = (mood) => {
      const newMood = { mood, timestamp: new Date() };
      setMoodHistory(prev => [...prev, newMood]);
  };
    
  const renderContent = () => {
      switch (activeTab) {
        case 'chat': return <ChatComponent />;
        case 'journal': return <JournalComponent entries={journalEntries} addEntry={addJournalEntry} />;
        case 'wellness': return <WellnessComponent addJournalEntry={addJournalEntry} />;
        case 'tracker': return <MoodTrackerComponent moodHistory={moodHistory} addMoodLog={addMoodLog} />;
        default: return <ChatComponent />;
      }
  };
    
  return (
      <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col items-center justify-center p-2 md:p-4">
        <div className="w-full max-w-lg h-[95vh] md:h-[80vh] bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-700">
          <header className="p-4 border-b border-gray-700 flex justify-between items-center">
              <div>
                  <h1 className="text-2xl font-bold text-blue-400">Mind Mate</h1>
                  <p className="text-gray-400 text-xs">Your Private Wellness Companion</p>
              </div>
          </header>
          <main className="flex-grow p-4 overflow-y-auto">{renderContent()}</main>
          <nav className="flex justify-around p-2 bg-gray-800 border-t border-gray-700">
            <NavButton icon="💬" label="Chat" isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
            <NavButton icon="📓" label="Journal" isActive={activeTab === 'journal'} onClick={() => setActiveTab('journal')} />
            <NavButton icon="🧘" label="Wellness" isActive={activeTab === 'wellness'} onClick={() => setActiveTab('wellness')} />
            <NavButton icon="📊" label="Tracker" isActive={activeTab === 'tracker'} onClick={() => setActiveTab('tracker')} />
          </nav>
        </div>
      </div>
  );
}

// --- Navigation Component ---
const NavButton = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-1/4 p-2 rounded-lg transition-colors duration-200 ${isActive ? 'text-blue-400 bg-gray-700' : 'text-gray-400 hover:bg-gray-700'}`}
  >
    <span className="text-2xl">{icon}</span>
    <span className="text-xs mt-1">{label}</span>
  </button>
);

// --- Loading Component ---
const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400"></div>
    </div>
);


// --- Chat Component ---
const ChatComponent = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm Mind Mate, your supportive companion. How are you feeling today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);
  
  const systemPrompt = `You are Mind Mate, a highly empathetic and supportive AI companion for youth and students. You are acting as a "Copilot" for their mental wellness journey.
    - IMPORTANT: You must be able to understand and respond fluently in English, Hindi, and Hinglish. Adapt your language to match the user's language. For example, if the user says 'Mujhe aacha nahi lag raha', you should respond in Hindi/Hinglish.
    - Your primary goal is to provide a safe, non-judgmental space for them to express their feelings.
    - Your tone must be consistently warm, encouraging, and gentle. Use emojis where appropriate to convey warmth.
    - Never give medical advice, diagnoses, or therapy. You are a supportive friend, not a doctor.
    - If the user expresses feelings of hopelessness, self-harm, or severe distress, your *only* response should be: "[CRISIS_DETECTED]". Do not add any other text.
    - Guide users towards positive coping mechanisms like journaling, breathing exercises, or talking to a trusted person.
    - Keep responses concise and focused on validating their feelings and offering gentle support.`;
    
  const getAIAssistantResponse = async (userQuery) => {
    const apiKey = ""; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "I'm not sure how to respond to that.";
  };

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        const aiResponse = await getAIAssistantResponse(input);

        if (aiResponse.includes("[CRISIS_DETECTED]")) {
            setShowCrisisModal(true);
            const crisisMessage = { role: 'assistant', content: "It sounds like you're going through a lot right now... For immediate support, please contact a professional. Here are some resources." };
            setMessages(prev => [...prev, crisisMessage]);
        } else {
            const assistantMessage = { role: 'assistant', content: aiResponse };
            setMessages(prev => [...prev, assistantMessage]);
        }

    } catch (error) {
        console.error("Error fetching AI response:", error);
        const errorMessage = { role: 'assistant', content: "I'm having a little trouble connecting right now. Please try again." };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 rounded-br-none' : 'bg-gray-600 rounded-bl-none'}`}>
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                 <div className="max-w-xs md:max-w-md p-3 rounded-2xl bg-gray-600 rounded-bl-none">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse delay-75"></div>
                        <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse delay-150"></div>
                    </div>
                 </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-4 flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          className="flex-grow bg-gray-700 text-white rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button onClick={handleSend} disabled={isLoading} className="ml-2 bg-blue-600 text-white rounded-full p-2.5 hover:bg-blue-700 disabled:bg-gray-500 transition-colors flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
        </button>
      </div>
      {showCrisisModal && <CrisisSupportModal onClose={() => setShowCrisisModal(false)} />}
    </div>
  );
};

// --- Journal Component ---
const JournalComponent = ({ entries, addEntry }) => {
    const [entry, setEntry] = useState('');

    const handleSave = () => {
        if (entry.trim() === '') return;
        const newEntry = {
            id: new Date().toISOString(),
            text: entry,
            type: 'standard',
            timestamp: new Date(),
        };
        addEntry(newEntry);
        setEntry('');
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4 text-blue-300">My Journal</h2>
            <textarea
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="What's on your mind today?"
                className="w-full h-32 bg-gray-700 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <button onClick={handleSave} className="w-full bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 transition-colors">
                Save Entry
            </button>
            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2 text-blue-300">Past Entries</h3>
                <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                    {entries.length > 0 ? entries.map(e => (
                        <div key={e.id} className={`p-3 rounded-lg ${e.type === 'gratitude' ? 'bg-green-800 bg-opacity-40 border-l-4 border-green-400' : 'bg-gray-700'}`}>
                            <p className="text-sm text-gray-300">{e.text}</p>
                            <p className="text-xs text-gray-500 mt-2 text-right">{formatDate(e.timestamp)}</p>
                        </div>
                    )) : <p className="text-gray-400 text-sm">No entries yet. Start writing!</p>}
                </div>
            </div>
        </div>
    );
};

// --- Wellness Component ---
const WellnessComponent = ({ addJournalEntry }) => {
    const [activeTool, setActiveTool] = useState('breathing');
    return (
        <div>
            <h2 className="text-xl font-semibold mb-4 text-blue-300">Wellness Toolkit</h2>
            <div className="flex justify-around mb-4 bg-gray-700 rounded-lg p-1">
                <button onClick={() => setActiveTool('breathing')} className={`px-4 py-2 rounded-lg text-sm w-full ${activeTool === 'breathing' ? 'bg-blue-600' : ''}`}>Breathing</button>
                <button onClick={() => setActiveTool('meditation')} className={`px-4 py-2 rounded-lg text-sm w-full ${activeTool === 'meditation' ? 'bg-blue-600' : ''}`}>Meditation</button>
                <button onClick={() => setActiveTool('gratitude')} className={`px-4 py-2 rounded-lg text-sm w-full ${activeTool === 'gratitude' ? 'bg-blue-600' : ''}`}>Gratitude</button>
            </div>
            {activeTool === 'breathing' && <BreathingExercise />}
            {activeTool === 'meditation' && <MeditationTimer />}
            {activeTool === 'gratitude' && <GratitudePrompt addJournalEntry={addJournalEntry} />}
        </div>
    );
};

const BreathingExercise = () => {
    const [text, setText] = useState('Get Ready...');
    const [animationClass, setAnimationClass] = useState('');

    useEffect(() => {
        const cycle = () => {
            setText('Breathe In...');
            setAnimationClass('animate-breathe-in');
            setTimeout(() => {
                setText('Hold...');
                 setTimeout(() => {
                    setText('Breathe Out...');
                    setAnimationClass('animate-breathe-out');
                }, 2000); 
            }, 4000); 
        };
        const interval = setInterval(cycle, 10000); 
        cycle();
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-4">
             <style>{`
                @keyframes breathe-in { 0% { transform: scale(0.8); } 100% { transform: scale(1.2); } }
                @keyframes breathe-out { 0% { transform: scale(1.2); } 100% { transform: scale(0.8); } }
                .animate-breathe-in { animation: breathe-in 4s ease-in-out forwards; }
                .animate-breathe-out { animation: breathe-out 4s ease-in-out forwards; }
            `}</style>
            <div className={`w-48 h-48 bg-blue-500 rounded-full flex items-center justify-center transition-transform duration-[4000ms] ease-in-out ${animationClass}`}>
                <p className="text-white text-lg font-semibold text-center">{text}</p>
            </div>
        </div>
    );
};

const MeditationTimer = () => {
    const [time, setTime] = useState(300);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let interval = null;
        if (isActive && time > 0) {
            interval = setInterval(() => setTime(t => t - 1), 1000);
        } else if (time === 0) {
            setIsActive(false);
        }
        return () => clearInterval(interval);
    }, [isActive, time]);

    const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

    return (
        <div className="text-center p-4">
            <p className="text-5xl font-mono mb-4">{formatTime(time)}</p>
            <button onClick={() => setIsActive(!isActive)} className="bg-blue-600 px-6 py-2 rounded-lg mr-2">
                {isActive ? 'Pause' : 'Start'}
            </button>
            <button onClick={() => { setTime(300); setIsActive(false); }} className="bg-gray-600 px-6 py-2 rounded-lg">
                Reset
            </button>
        </div>
    );
};

const GratitudePrompt = ({ addJournalEntry }) => {
    const [gratitude, setGratitude] = useState('');
    const [isSaved, setIsSaved] = useState(false);

    const handleSaveGratitude = () => {
        if (gratitude.trim() === '') return;
        const newEntry = {
            id: new Date().toISOString(),
            text: gratitude,
            type: 'gratitude',
            timestamp: new Date(),
        };
        addJournalEntry(newEntry);
        setGratitude('');
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    return (
        <div className="p-4">
            <p className="text-center mb-4 text-gray-300">Take a moment to think of three things you're grateful for today. It can be something big or small.</p>
            <textarea value={gratitude} onChange={(e) => setGratitude(e.target.value)} className="w-full h-32 bg-gray-700 rounded-lg p-3 mb-2" placeholder="1. ...&#10;2. ...&#10;3. ..."></textarea>
            <button onClick={handleSaveGratitude} className={`w-full text-white rounded-lg py-2 transition-colors ${isSaved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isSaved ? 'Saved! ✨' : 'Save to Journal'}
            </button>
        </div>
    );
};

// --- Mood Tracker Component ---
const MoodTrackerComponent = ({ moodHistory, addMoodLog }) => {
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        calculateStreak(moodHistory);
    }, [moodHistory]);
    
    const calculateStreak = (moodData) => {
        if (moodData.length === 0) {
            setStreak(0);
            return;
        }

        const getDayStart = (date) => {
            const d = date instanceof Date ? date : new Date(date);
            return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        };
        
        const uniqueDays = [...new Set(moodData.map(entry => getDayStart(entry.timestamp)))].sort((a,b) => b - a);

        if (uniqueDays.length === 0) {
            setStreak(0);
            return;
        }
        
        const today = getDayStart(new Date());
        const yesterday = getDayStart(new Date(Date.now() - 86400000));
        
        if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) {
            setStreak(0);
            return;
        }

        let currentStreak = 1;
        if (uniqueDays.length > 1) {
             for (let i = 0; i < uniqueDays.length - 1; i++) {
                const dayDiff = (uniqueDays[i] - uniqueDays[i+1]) / 86400000;
                if (dayDiff === 1) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }
        setStreak(currentStreak);
    };

    const chartData = moodHistory.map(m => ({
        name: formatDate(m.timestamp),
        moodValue: Object.keys(MOODS).indexOf(m.mood) + 1,
    }));
    
    const pieChartData = Object.entries(MOODS).map(([key, { label, color }]) => ({
        name: label,
        value: moodHistory.filter(m => m.mood === key).length,
        color: color
    })).filter(d => d.value > 0);

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4 text-blue-300">How are you feeling now?</h2>
            <div className="flex justify-around mb-6">
                {Object.entries(MOODS).map(([key, { emoji, label }]) => (
                    <button key={key} onClick={() => addMoodLog(key)} className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-700 transition-colors">
                        <span className="text-3xl">{emoji}</span>
                        <span className="text-xs mt-1 text-gray-400">{label}</span>
                    </button>
                ))}
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg mb-4 text-center">
                 <h3 className="text-lg font-semibold text-blue-300">Wellness Streak</h3>
                 <p className="text-3xl font-bold">{streak} {streak === 1 ? 'Day' : 'Days'} 🔥</p>
                 <p className="text-xs text-gray-400">Log your mood daily to keep it going!</p>
            </div>
            
            <h3 className="text-lg font-semibold mb-2 text-blue-300">Your Mood Journey</h3>
            {moodHistory.length > 1 ? (
                <div className="h-60 bg-gray-700 p-2 rounded-lg">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                            <XAxis dataKey="name" stroke="#A0AEC0" fontSize={12} />
                            <YAxis stroke="#A0AEC0" domain={[1, 6]} tickFormatter={(val) => Object.values(MOODS)[val-1]?.label || ''} fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#2D3748', border: 'none' }} labelStyle={{ color: '#E2E8F0' }} />
                            <Line type="monotone" dataKey="moodValue" stroke="#63B3ED" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : <p className="text-center text-gray-400">Log your mood for a few days to see your journey.</p>}
            
            <h3 className="text-lg font-semibold mt-6 mb-2 text-blue-300">Mood Overview</h3>
             {moodHistory.length > 0 ? (
                <div className="h-60 bg-gray-700 p-2 rounded-lg">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                               {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#2D3748', border: 'none' }}/>
                            <Legend wrapperStyle={{fontSize: "12px"}}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : <p className="text-center text-gray-400">No mood data to display yet.</p>}
        </div>
    );
};


// --- Crisis Support Modal ---
const CrisisSupportModal = ({ onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full border border-red-500">
            <h2 className="text-xl font-bold text-red-400 mb-4">Immediate Support is Available</h2>
            <p className="text-gray-300 mb-4">It's okay to not be okay. Talking to someone can help. Please reach out to one of these resources.</p>
            <ul className="space-y-3 text-sm">
                <li><a href="tel:988" className="text-blue-400 hover:underline"><strong>Crisis & Suicide Lifeline:</strong> Call or Text 988 (US & Canada)</a></li>
                <li><a href="https://www.thetrevorproject.org/get-help/" target="blank" rel="noopener noreferrer" className="text-blue-400 hover:underline"><strong>The Trevor Project (LGBTQ Youth):</strong> 1-866-488-7386</a></li>
                <li><a href="https://www.crisistextline.org/" target="blank" rel="noopener noreferrer" className="text-blue-400 hover:underline"><strong>Crisis Text Line:</strong> Text HOME to 741741</a></li>
            </ul>
             <p className="text-xs text-gray-500 mt-4">If you are in immediate danger, please call 911 or your local emergency number.</p>
            <button onClick={onClose} className="w-full mt-6 bg-gray-600 text-white rounded-lg py-2 hover:bg-gray-700 transition-colors">Close</button>
        </div>
    </div>
);
