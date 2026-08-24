import { Mic, Radio, Route, Star, Target, Wallet } from "lucide-react-native";
import { colors } from "../theme/colors";

export const aiModules = [
  { id: "itinerary", icon: Route, title: "AI Itinerary Generator", accuracy: "94% acc", description: "Generates step-by-step travel plans using budget and destination inputs", tag: "claude-sonnet-5", enabled: true },
  { id: "transit", icon: Radio, title: "Transit Prediction", accuracy: "88% acc", description: "Predicts arrival times and optimal public transport routes", tag: "Internal v2.1", enabled: true },
  { id: "voice", icon: Mic, title: "Voice Translator", accuracy: "91% acc", description: "Real-time Filipino, Pangasinan, and English translation", tag: "Whisper-PH + LLM", enabled: true },
  { id: "geofence", icon: Target, title: "Smart Geofence Alerts", accuracy: "97% acc", description: "ML-based proximity detection and push notifications", tag: "CoreML Proximity", enabled: true },
  { id: "budget", icon: Wallet, title: "Budget Optimizer", description: "Suggests cost-saving alternatives and rebalances trip budgets", tag: "Fine-tuned GPT", enabled: false },
  { id: "recommender", icon: Star, title: "Destination Recommender", description: "Recommendations based on travel history and ratings", tag: "CF Matrix v1.4", enabled: false },
];

export const modelPerformance = [{ day: "M", accuracy: 90 }, { day: "T", accuracy: 88 }, { day: "W", accuracy: 93 }, { day: "T", accuracy: 91 }, { day: "F", accuracy: 94 }, { day: "S", accuracy: 93 }, { day: "S", accuracy: 93 }];
export const growthData = [{ month: "Mar", users: 3200 }, { month: "Apr", users: 3600 }, { month: "May", users: 3950 }, { month: "Jun", users: 4250 }, { month: "Jul", users: 4550 }, { month: "Aug", users: 4821 }];
export const weeklyUserActivity = [{ day: "Mon", users: 480 }, { day: "Tue", users: 520 }, { day: "Wed", users: 610 }, { day: "Thu", users: 560 }, { day: "Fri", users: 780 }, { day: "Sat", users: 1120 }, { day: "Sun", users: 990 }];
export const topDestinations = [
  { name: "Hundred Islands", value: 1248, icon: Route },
  { name: "Lingayen", value: 986, icon: Target },
  { name: "Patar Beach", value: 854, icon: Star },
  { name: "Manaoag Shrine", value: 723, icon: Radio },
  { name: "Dagupan", value: 612, icon: Wallet },
];
