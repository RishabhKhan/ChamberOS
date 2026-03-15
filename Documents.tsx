import React, { useState } from 'react';
import Calendar from 'react-calendar';
import { Appointment } from './types';
import { Clock, MapPin, User, Plus, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { getGoogleCalendarEvents, GoogleEvent, createGoogleCalendarEvent } from './types';
import { useModal } from './googleService';

interface CalendarViewProps {
  appointments: Appointment[];
  onAddAppointment: (a: Omit<Appointment, 'id'>) => void;
  onDeleteAppointment: (id: string) => void;
  isGoogleConnected: boolean;
}

export default function CalendarView({ appointments, onAddAppointment, onDeleteAppointment, isGoogleConnected }: CalendarViewProps) {
  const { showConfirm } = useModal();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncToGoogle, setSyncToGoogle] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

  const fetchGoogleEvents = async () => {
    if (!isGoogleConnected) return;
    setIsLoadingGoogle(true);
    try {
      const { events, unauthorized } = await getGoogleCalendarEvents();
      if (unauthorized) {
        setGoogleEvents([]);
      } else {
        setGoogleEvents(events);
      }
    } catch (error) {
      console.error('Failed to fetch Google events:', error);
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  React.useEffect(() => {
    fetchGoogleEvents();
  }, [isGoogleConnected]);

  const allEvents = [
    ...appointments.map(a => ({
      id: a.id,
      title: a.title,
      date: new Date(a.date),
      time: a.time,
      client: a.client,
      type: a.type,
      location: a.location,
      source: 'local' as const
    })),
    ...googleEvents.map(e => {
      const rawDate = e.start.dateTime || e.start.date || '';
      const parsedDate = rawDate ? new Date(rawDate) : new Date();
      const isValidDate = !isNaN(parsedDate.getTime());
      return {
        id: e.id,
        title: e.summary,
        date: isValidDate ? parsedDate : new Date(),
        time: e.start.dateTime && isValidDate ? format(parsedDate, 'HH:mm') : 'All Day',
        client: 'Google Calendar',
        type: 'meeting' as const,
        location: e.location,
        source: 'google' as const
      };
    })
  ];

  const dayAppointments = allEvents.filter(app => 
    isSameDay(app.date, selectedDate)
  );

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-legal-navy">Chamber Calendar</h2>
          <p className="text-sm text-slate-500">Manage hearings, meetings, and consultations</p>
        </div>
        <div className="flex items-center gap-3">
          {isGoogleConnected && (
            <button 
              onClick={fetchGoogleEvents}
              disabled={isLoadingGoogle}
              className="p-2 text-slate-400 hover:text-legal-navy transition-colors bg-white rounded-xl border border-slate-200"
              title="Sync Google Calendar"
            >
              <RefreshCw size={18} className={isLoadingGoogle ? 'animate-spin' : ''} />
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-legal-navy text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            <Plus size={18} />
            New Appointment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <Calendar 
              onChange={(val) => setSelectedDate(val as Date)} 
              value={selectedDate}
              className="mx-auto"
              tileContent={({ date }) => {
                const hasApp = allEvents.some(a => isSameDay(a.date, date));
                return hasApp ? (
                  <div className="flex justify-center mt-1">
                    <div className="w-1 h-1 bg-legal-gold rounded-full" />
                  </div>
                ) : null;
              }}
            />
          </div>

          {/* Upcoming Overview */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-6">Upcoming Hearings</h3>
            <div className="space-y-4">
              {allEvents
                .filter(a => (a.type === 'hearing' || a.source === 'google') && a.date >= new Date())
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .slice(0, 3)
                .map(event => (
                  <div key={event.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-2 rounded-xl shadow-sm">
                        {event.source === 'google' ? (
                          <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center text-[8px] text-white font-bold">G</div>
                        ) : (
                          <Scale className="text-legal-navy" size={20} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{event.title}</p>
                        <p className="text-xs text-slate-500">{format(event.date, 'PPP')}</p>
                      </div>
                    </div>
                    <ChevronRight className="text-slate-300" size={20} />
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Schedule Column */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-full min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
                Schedule for {format(selectedDate, 'MMM d')}
              </h3>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                {dayAppointments.length} Events
              </span>
            </div>

            <div className="flex-1 space-y-4">
              {dayAppointments.length > 0 ? (
                dayAppointments.sort((a, b) => a.time.localeCompare(b.time)).map(app => (
                  <div key={app.id} className={`group relative pl-4 border-l-2 ${app.source === 'google' ? 'border-blue-500' : 'border-legal-gold'}`}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className={`text-xs font-bold ${app.source === 'google' ? 'text-blue-500' : 'text-legal-gold'}`}>{app.time}</span>
                      <div className="flex items-center gap-2">
                        {app.source === 'google' && (
                          <span className="text-[8px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-widest">Google</span>
                        )}
                        <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          app.type === 'hearing' ? 'bg-rose-50 text-rose-600' :
                          app.type === 'consultation' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          {app.type}
                        </span>
                        {app.source === 'local' && (
                          <button 
                            onClick={() => {
                              showConfirm(
                                'Cancel Appointment',
                                'Are you sure you want to cancel this appointment?',
                                () => onDeleteAppointment(app.id)
                              );
                            }}
                            className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-800 group-hover:text-legal-navy transition-colors">{app.title}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <User size={12} />
                        {app.client}
                      </div>
                      {app.location && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <MapPin size={12} />
                          {app.location}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <CalendarIcon className="text-slate-200" size={32} />
                  </div>
                  <p className="text-sm font-medium text-slate-400">No events scheduled for this day.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Appointment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-legal-navy mb-6">New Appointment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Title</label>
                <input id="title" type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="e.g. Hearing - State vs Kumar" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Time</label>
                  <input id="time" type="time" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Type</label>
                  <select id="type" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    <option value="consultation">Consultation</option>
                    <option value="hearing">Hearing</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Client</label>
                <input id="client" type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Client Name" />
              </div>
              {isGoogleConnected && (
                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="syncGoogle" 
                    checked={syncToGoogle}
                    onChange={(e) => setSyncToGoogle(e.target.checked)}
                    className="rounded border-slate-300 text-legal-navy focus:ring-legal-navy" 
                  />
                  <label htmlFor="syncGoogle" className="text-xs font-medium text-slate-600">Sync to Google Calendar</label>
                </div>
              )}
              <div className="flex items-center gap-3 mt-8">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    const title = (document.getElementById('title') as HTMLInputElement).value;
                    const time = (document.getElementById('time') as HTMLInputElement).value;
                    const type = (document.getElementById('type') as HTMLSelectElement).value;
                    const client = (document.getElementById('client') as HTMLInputElement).value;
                    
                    if (!title || !time || !client) return;

                    const appointmentDate = format(selectedDate, 'yyyy-MM-dd');
                    
                    onAddAppointment({
                      title,
                      date: appointmentDate,
                      time,
                      client,
                      type: type as any
                    });

                    if (syncToGoogle && isGoogleConnected) {
                      try {
                        const startDateTime = new Date(`${appointmentDate}T${time}:00`).toISOString();
                        const endDateTime = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString();
                        const { ok, unauthorized } = await createGoogleCalendarEvent({
                          summary: title,
                          description: `Client: ${client}\nType: ${type}`,
                          start: startDateTime,
                          end: endDateTime,
                        });
                        if (!unauthorized && ok) fetchGoogleEvents();
                      } catch (err) {
                        console.error('Failed to sync to Google Calendar:', err);
                      }
                    }

                    setIsModalOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-legal-navy text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Scale({ className, size }: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
    </svg>
  );
}
