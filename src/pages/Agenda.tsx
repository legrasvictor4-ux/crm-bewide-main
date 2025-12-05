import { useState } from "react";
import { ArrowLeft, Plus, Calendar as CalendarIcon, Clock, MapPin, Phone, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Event {
  id: string;
  title: string;
  time: string;
  location: string;
  type: "rdv" | "prospection" | "rappel";
  completed: boolean;
  contact?: string;
}

const mockEvents: Record<string, Event[]> = {
  [format(new Date(), "yyyy-MM-dd")]: [
    { id: "1", title: "Le Comptoir du Renne", time: "11:00", location: "3ème arr.", type: "rdv", completed: false, contact: "Marie (patronne)" },
    { id: "2", title: "Zone 11ème", time: "14:30", location: "11ème arr.", type: "prospection", completed: false },
  ],
  [format(addDays(new Date(), 1), "yyyy-MM-dd")]: [
    { id: "3", title: "Café de la Paix", time: "10:00", location: "10ème arr.", type: "rappel", completed: false, contact: "Jean-Pierre" },
    { id: "4", title: "Prospection Bastille", time: "15:00", location: "11ème arr.", type: "prospection", completed: false },
  ],
  [format(addDays(new Date(), 2), "yyyy-MM-dd")]: [
    { id: "5", title: "Restaurant Le Marais", time: "09:30", location: "4ème arr.", type: "rdv", completed: false, contact: "Sophie" },
  ],
};

const Agenda = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState(mockEvents);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const dayEvents = events[selectedDateKey] || [];

  const toggleComplete = (eventId: string) => {
    setEvents(prev => {
      const updated = { ...prev };
      if (updated[selectedDateKey]) {
        updated[selectedDateKey] = updated[selectedDateKey].map(e =>
          e.id === eventId ? { ...e, completed: !e.completed } : e
        );
      }
      return updated;
    });
    toast.success("Statut mis à jour");
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "rdv": return "bg-success/10 text-success border-success/20";
      case "prospection": return "bg-accent/10 text-accent border-accent/20";
      case "rappel": return "bg-warning/10 text-warning border-warning/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "rdv": return "RDV";
      case "prospection": return "Prospection";
      case "rappel": return "Rappel";
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/")}
                className="p-2 hover:bg-secondary rounded-xl transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
                <p className="text-sm text-muted-foreground">
                  {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
                </p>
              </div>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau RDV
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        {/* Week selector */}
        <div className="grid grid-cols-7 gap-2 mb-8">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const dayKey = format(day, "yyyy-MM-dd");
            const hasEvents = events[dayKey]?.length > 0;

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`p-4 rounded-2xl text-center transition-all duration-200 ${
                  isSelected
                    ? "bg-accent text-accent-foreground shadow-lg shadow-accent/25"
                    : isToday
                    ? "bg-secondary border-2 border-accent/30"
                    : "bg-card hover:bg-secondary border border-border"
                }`}
              >
                <div className="text-xs font-medium opacity-70 mb-1">
                  {format(day, "EEE", { locale: fr })}
                </div>
                <div className="text-xl font-bold">{format(day, "d")}</div>
                {hasEvents && (
                  <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-2 ${
                    isSelected ? "bg-accent-foreground" : "bg-accent"
                  }`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Events list */}
        <div className="space-y-4">
          {dayEvents.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Aucun événement ce jour</p>
              <Button variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Ajouter un événement
              </Button>
            </div>
          ) : (
            dayEvents.map((event, index) => (
              <div
                key={event.id}
                className={`card-interactive p-5 animate-slide-up ${
                  event.completed ? "opacity-60" : ""
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleComplete(event.id)}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      event.completed
                        ? "bg-success border-success text-success-foreground"
                        : "border-border hover:border-accent"
                    }`}
                  >
                    {event.completed && <Check className="h-4 w-4" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`font-semibold text-lg ${
                        event.completed ? "line-through" : ""
                      }`}>
                        {event.title}
                      </h3>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getTypeColor(event.type)}`}>
                        {getTypeLabel(event.type)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {event.time}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </span>
                      {event.contact && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-4 w-4" />
                          {event.contact}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Modifier
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Agenda;