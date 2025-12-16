import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { sendEventNotification } from '../../../../services/notificationService';
import { db, auth } from '../../../../config/firebase.js';
import { FaEdit, FaTrash, FaPlus, FaChevronLeft, FaChevronRight, FaEye, FaTimes, FaCheck } from 'react-icons/fa';
import { CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET } from '../../../../config/cloudinary.js';
import { logActivity, ACTIVITY_TYPES } from '../../../../services/activityLogService';

const AdminEventManagement = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  
 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [currentEvent, setCurrentEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    status: 'on',
    imageUrl: ''
  });
  const [previewEvent, setPreviewEvent] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dateValidationModal, setDateValidationModal] = useState({ show: false, message: '' });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ show: false, eventId: null, eventTitle: '' });
  const [selectedDate, setSelectedDate] = useState(null);
  const [filteredEvents, setFilteredEvents] = useState([]);
  
 
  const getEasterSunday = (year) => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  };

 
  const getPhilippineHolidays = (year) => {
    const holidays = [
      `${year}-01-01`, // New Year's Day
      `${year}-04-09`, // Day of Valor
      `${year}-05-01`, // Labor Day
      `${year}-06-12`, // Independence Day
      `${year}-08-26`, // National Heroes Day
      `${year}-11-30`, // Bonifacio Day
      `${year}-12-25`, // Christmas Day
      `${year}-12-30`, // Rizal Day
      `${year}-12-31`, // New Year's Eve
    ];

    
    const chineseNewYear = [
      '2024-02-10', '2025-01-29', '2026-02-17', '2027-02-06', '2028-01-26',
      '2029-02-13', '2030-02-03', '2031-01-23', '2032-02-11', '2033-01-31'
    ];
    const cny = chineseNewYear.find(date => date.startsWith(year.toString()));
    if (cny) holidays.push(cny);

    
    holidays.push(`${year}-02-25`);

    
    const easterSunday = getEasterSunday(year);
    const maundyThursday = new Date(easterSunday);
    maundyThursday.setDate(easterSunday.getDate() - 3);
    const goodFriday = new Date(easterSunday);
    goodFriday.setDate(easterSunday.getDate() - 2);
    const blackSaturday = new Date(easterSunday);
    blackSaturday.setDate(easterSunday.getDate() - 1);

    holidays.push(
      maundyThursday.toISOString().split('T')[0],
      goodFriday.toISOString().split('T')[0],
      blackSaturday.toISOString().split('T')[0],
      easterSunday.toISOString().split('T')[0]
    );

    return holidays;
  };

  
  const currentYear = new Date().getFullYear();
  const philippineHolidays = getPhilippineHolidays(currentYear);

  
  const isWeekend = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6; 
  };

  
  const isHoliday = (dateString) => {
    return philippineHolidays.includes(dateString);
  };

  
  const isDateDisabled = (dateString) => {
    return isWeekend(dateString) || isHoliday(dateString);
  };
  
  
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const eventCollection = collection(db, 'events');
        const eventSnapshot = await getDocs(eventCollection);
        const eventList = eventSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEvents(eventList);
        setError(null);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load events. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);
  
  // Filter events by selected date
  useEffect(() => {
    const dateFiltered = selectedDate
      ? events.filter(e => {
          if (!e.date) return false;
          return e.date === selectedDate;
        })
      : events;
    setFilteredEvents(dateFiltered);
  }, [events, selectedDate]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentEvent(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'on' ? 'off' : 'on';
      await updateDoc(doc(db, 'events', id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      setEvents(prev => 
        prev.map(event => 
          event.id === id ? { ...event, status: newStatus } : event
        )
      );
      // Log publish/draft activity
      try {
        const user = auth.currentUser;
        await logActivity({
          type: newStatus === 'on' ? ACTIVITY_TYPES.PUBLISH : ACTIVITY_TYPES.DRAFT,
          userId: user?.uid || null,
          userEmail: user?.email || null,
          role: 'admin',
          description: newStatus === 'on' ? 'Published new Post in Event' : 'Hide an Post on Event',
          category: 'admin',
          metadata: { eventId: id },
        });
      } catch {}
    } catch (err) {
      console.error('Error toggling event status:', err);
      setError('Failed to update event status. Please try again.');
    }
  };
  
  
  const handleAddEvent = () => {
    setCurrentEvent({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      location: '',
      status: 'on',
      imageUrl: ''
    });
    setFormMode('add');
    setIsModalOpen(true);
  };
  
  
  const handleEditEvent = (event) => {
    setCurrentEvent({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      status: event.status || 'on',
      imageUrl: event.imageUrl
    });
    setFormMode('edit');
    setIsModalOpen(true);
  };

  // Upload event image to Cloudinary
  const handleEventImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.secure_url) {
        setCurrentEvent(prev => ({ ...prev, imageUrl: data.secure_url }));
      } else {
        console.error('Cloudinary upload error:', data);
        setError('Image upload failed. Please try a different image.');
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Image upload failed. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };
  
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Ensure date is in YYYY-MM-DD format
      let eventDate = currentEvent.date;
      if (!eventDate) {
        setError('Date is required.');
        return;
      }
      // If date is a Date object, convert to string
      if (eventDate instanceof Date) {
        eventDate = eventDate.toISOString().split('T')[0];
      }
      const eventData = {
        title: currentEvent.title,
        description: currentEvent.description,
        date: eventDate,
        time: currentEvent.time,
        location: currentEvent.location,
        status: currentEvent.status,
        imageUrl: currentEvent.imageUrl,
        createdAt: new Date().toISOString()
      };
      if (formMode === 'add') {
        // Add event directly
        const docRef = await addDoc(collection(db, 'events'), eventData);
        setEvents(prev => [...prev, { id: docRef.id, ...eventData }]);

        // Send notifications to all students
        const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const studentsSnapshot = await getDocs(studentsQuery);
        const notificationPromises = studentsSnapshot.docs.map(doc =>
          sendEventNotification(doc.id, eventData.title)
        );
        await Promise.all(notificationPromises);
        showNotification('Event created successfully!', 'success');

        // Log create and status
        try {
          const user = auth.currentUser;
          await logActivity({
            type: ACTIVITY_TYPES.EVENT_CREATED,
            userId: user?.uid || null,
            userEmail: user?.email || null,
            role: 'admin',
            description: 'Created a new Event',
            category: 'admin',
            metadata: { eventId: docRef.id, title: eventData.title },
          });
          await logActivity({
            type: eventData.status === 'on' ? ACTIVITY_TYPES.PUBLISH : ACTIVITY_TYPES.DRAFT,
            userId: user?.uid || null,
            userEmail: user?.email || null,
            role: 'admin',
            description: eventData.status === 'on' ? 'Published new Post in Event' : 'Hide an Post on Event',
            category: 'admin',
            metadata: { eventId: docRef.id, title: eventData.title },
          });
        } catch {}
      } else {
        // Update event directly
        const { id } = currentEvent;
        await updateDoc(doc(db, 'events', id), {
          ...eventData,
          updatedAt: new Date().toISOString()
        });
        setEvents(prev =>
          prev.map(event =>
            event.id === id ? { ...event, ...eventData } : event
          )
        );
        showNotification('Event updated successfully!', 'success');
        // Log update and status
        try {
          const user = auth.currentUser;
          await logActivity({
            type: ACTIVITY_TYPES.EVENT_UPDATED,
            userId: user?.uid || null,
            userEmail: user?.email || null,
            role: 'admin',
            description: 'Update an Post on the Event',
            category: 'admin',
            metadata: { eventId: id, title: eventData.title },
          });
          await logActivity({
            type: eventData.status === 'on' ? ACTIVITY_TYPES.PUBLISH : ACTIVITY_TYPES.DRAFT,
            userId: user?.uid || null,
            userEmail: user?.email || null,
            role: 'admin',
            description: eventData.status === 'on' ? 'Published new Post in Event' : 'Hide an Post on Event',
            category: 'admin',
            metadata: { eventId: id, title: eventData.title },
          });
        } catch {}
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving event:', err);
      setError('Failed to save event. Please try again.');
    }
  };
  
  
  const handleDeleteEvent = (event) => {
    setDeleteConfirmModal({
      show: true,
      eventId: event.id,
      eventTitle: event.title
    });
  };

  const confirmDeleteEvent = async () => {
    const { eventId } = deleteConfirmModal;
    try {
      await deleteDoc(doc(db, 'events', eventId));
      setEvents(prev => prev.filter(event => event.id !== eventId));
      setDeleteConfirmModal({ show: false, eventId: null, eventTitle: '' });
      showNotification('Event deleted successfully!', 'success');
      try {
        const user = auth.currentUser;
        await logActivity({
          type: ACTIVITY_TYPES.EVENT_DELETED,
          userId: user?.uid || null,
          userEmail: user?.email || null,
          role: 'admin',
          description: 'Delete an Event',
          category: 'admin',
          severity: 'warning',
          metadata: { eventId },
        });
      } catch {}
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Failed to delete event. Please try again.');
      setDeleteConfirmModal({ show: false, eventId: null, eventTitle: '' });
    }
  };

  const cancelDeleteEvent = () => {
    setDeleteConfirmModal({ show: false, eventId: null, eventTitle: '' });
  };
  
  
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Notification functions
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    // Auto-close after 4 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };
  
  // Calendar helper functions
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
  
  const fmtYMD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  
  const getCountsByDate = () => {
    const map = {};
    events.forEach(e => {
      if (!e.date) return;
      const key = e.date; // Already in YYYY-MM-DD format
      if (!map[key]) map[key] = { total: 0, on: 0, off: 0 };
      map[key].total += 1;
      if (e.status === 'on') map[key].on += 1; else map[key].off += 1;
    });
    return map;
  };
  
  const countsByDate = getCountsByDate();
  
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  
  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const boxes = [];
    for (let i = 0; i < firstDay; i++) {
      boxes.push(<div key={`e-${i}`} className="h-16 border rounded bg-gray-50" />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const key = fmtYMD(dateObj);
      const counts = countsByDate[key] || { total: 0, on: 0, off: 0 };
      const isSelected = selectedDate === key;
      
      boxes.push(
        <button
          key={`d-${day}`}
          onClick={() => setSelectedDate(isSelected ? null : key)}
          className={`h-16 border rounded p-1 text-left transition ${
            isSelected ? 'bg-[#E3F0FF] border-[#014F86]' : 'bg-white hover:bg-[#F8FAFC]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#014F86]">{day}</span>
            {counts.total > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FFC30B] text-[#0A2463] font-bold">
                {counts.total}
              </span>
            )}
          </div>
          <div className="mt-1 flex gap-1">
            {counts.on > 0 && (
              <span className="text-[10px] px-1 rounded bg-green-100 text-green-700">On {counts.on}</span>
            )}
            {counts.off > 0 && (
              <span className="text-[10px] px-1 rounded bg-orange-100 text-orange-700">Off {counts.off}</span>
            )}
          </div>
        </button>
      );
    }
    
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-[#E2E8F0] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] border-b">
          <button onClick={prevMonth} className="text-[#014F86] hover:text-[#4169E1] font-semibold">←</button>
          <div className="text-[#014F86] font-bold">
            {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(currentMonth)}
          </div>
          <button onClick={nextMonth} className="text-[#014F86] hover:text-[#4169E1] font-semibold">→</button>
        </div>

        <div className="px-4 py-3">
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">{boxes}</div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> On
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span> Off
              </span>
            </div>
            {selectedDate && (
              <button size="small" onClick={() => setSelectedDate(null)} className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded font-sans">Clear date</button>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <div className="bg-white p-6 rounded-lg shadow-md font-sans">
        {/* Notification Popup */}
        {notification.show && (
          <div className="fixed top-4 right-4 z-[60]" style={{
            animation: 'slideInRight 0.3s ease-out forwards'
          }}>
            <div className={`flex items-center p-4 rounded-lg shadow-lg border-l-4 ${
              notification.type === 'success' 
                ? 'bg-green-50 border-green-500 text-green-800' 
                : 'bg-red-50 border-red-500 text-red-800'
            } min-w-[300px] max-w-md`}>
              <div className="flex items-center flex-1">
                <div className={`flex-shrink-0 w-5 h-5 mr-3 ${
                  notification.type === 'success' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
                </div>
                <p className="font-medium font-sans">{notification.message}</p>
              </div>
              <button
                onClick={closeNotification}
                className={`ml-4 flex-shrink-0 rounded-md p-1.5 inline-flex ${
                  notification.type === 'success'
                    ? 'text-green-500 hover:bg-green-100 focus:bg-green-100'
                    : 'text-red-500 hover:bg-red-100 focus:bg-red-100'
                } transition-colors`}
                aria-label="Close notification"
              >
                <FaTimes className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center mb-6">
  <h2 className="text-2xl text-gray-800 font-sans">Event Management</h2>
        <button
          onClick={handleAddEvent}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center font-sans"
        >
          <FaPlus className="mr-2" /> Add New Event
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-2/3 overflow-x-auto">
          <div className="rounded-2xl shadow-lg border-t-8 border-[#FFC30B] bg-white overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="py-4 px-4 bg-[#014F86] text-white text-base text-left font-sans">Event Name</th>
                  <th className="py-4 px-4 bg-[#014F86] text-white text-base text-left font-sans">Date</th>
                  <th className="py-4 px-4 bg-[#014F86] text-white text-base text-left font-sans">Venue</th>
                  <th className="py-4 px-4 bg-[#014F86] text-white text-base text-left font-sans">Status</th>
                  <th className="py-4 px-4 bg-[#014F86] text-white text-base text-left font-sans">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500 font-sans">
                      {selectedDate ? 'No events found for this date.' : 'No events found. Add your first event!'}
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((event, idx) => (
                    <tr
                      key={event.id}
                      className={
                        idx % 2 === 0
                          ? "bg-[#F8FAFC] hover:bg-[#E3F0FF] transition-colors duration-150"
                          : "bg-white hover:bg-[#E3F0FF] transition-colors duration-150"
                      }
                    >
                      <td className="py-3 px-4 font-sans">{event.title}</td>
                      <td className="py-3 px-4 font-sans">{event.date} {event.time}</td>
                      <td className="py-3 px-4 font-sans">{event.location}</td>
                      <td className="py-3 px-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={event.status === 'on'}
                            onChange={() => handleToggleStatus(event.id, event.status)}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4169E1]/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#014F86]/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4169E1]"></div>
                          <span className="ml-3 text-sm font-sans">
                            {event.status === 'on' ? 'ON' : 'OFF'}
                          </span>
                        </label>
                      </td>
                      <td className="py-3 px-4 flex space-x-2">
                        <button
                          onClick={() => setPreviewEvent(event)}
                          className="text-green-600 hover:text-green-800 p-2 rounded-full hover:bg-green-100 transition-colors font-sans"
                          title="View Event"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="text-[#4169E1] hover:text-[#014F86] p-2 rounded-full hover:bg-[#E3F0FF] transition-colors font-sans"
                          title="Edit Event"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event)}
                          className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-100 transition-colors font-sans"
                          title="Delete Event"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        
        <div className="w-full md:w-1/3">
          {generateCalendar()}
        </div>
      </div>

{previewEvent && (
  <div className="fixed inset-0 bg-[#014F86]/60 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative border-t-8 border-[#FFC30B]">
      <button
        onClick={() => setPreviewEvent(null)}
        className="absolute top-2 right-4 text-[#014F86] hover:text-[#FFC30B] text-3xl font-bold"
        aria-label="Close"
      >
        &times;
      </button>

  <h2 className="text-2xl mb-3 text-[#014F86] tracking-wide font-sans">
        <span className="text-[#FFC30B]">MALANDAY</span>{" "}
        <span className="text-[#4169E1]">Edu</span>
        <span className="text-[#014F86]">Track</span>
      </h2>

  <h3 className="text-lg mb-4 text-gray-800 font-sans">
        {previewEvent.title}
      </h3>

      {previewEvent.imageUrl && (
        <img
          src={previewEvent.imageUrl}
          alt={previewEvent.title}
          className="w-full h-60 object-cover rounded-xl mb-4 border border-[#014F86]/20"
        />
      )}

  <div className="text-sm text-gray-700 space-y-2 font-sans">
        <div>
          <span className="font-sans">Date:</span>{" "}
          {previewEvent.date} {previewEvent.time}
        </div>
        <div>
          <span className="font-sans">Location:</span>{" "}
          {previewEvent.location}
        </div>
        <div>
          <span className="font-sans">Status:</span>{" "}
          <span className={previewEvent.status === 'on' ? "text-green-600" : "text-red-600 font-sans"}>
            {previewEvent.status === 'on' ? 'ON' : 'OFF'}
          </span>
        </div>
        <div>
          <span className="font-sans">Description:</span>
          <p className="mt-1 font-sans">{previewEvent.description}</p>
        </div>
      </div>
    </div>
  </div>
)}

      {isModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#014F86]/80 backdrop-blur-sm">
    <div className="relative w-full max-w-2xl rounded-3xl shadow-2xl bg-white overflow-hidden">
      {/* Gradient Header */}
      <div className="flex items-center justify-between px-8 py-6 bg-blue-600 text-white">
  <h3 className="text-3xl tracking-tight text-white flex items-center gap-3 drop-shadow font-sans">
          <span className="shadow bold">
            {formMode === 'add' ? 'Add New' : 'Edit'}
          </span>
          <span className="text-white">Event</span>
        </h3>
        <button
          onClick={closeModal}
            className="absolute top-4 right-6 text-white hover:text-red-500 text-4xl transition-colors drop-shadow-lg font-sans"
          aria-label="Close"
        >
          &times;
        </button>
      </div>

  <form onSubmit={handleSubmit} className="px-8 py-8 font-sans">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-[#014F86] text-base mb-2 font-sans" htmlFor="title">
              Event Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={currentEvent.title}
              onChange={handleInputChange}
              className="shadow border border-[#014F86]/30 rounded-xl w-full py-3 px-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1] transition font-sans"
              required
            />
          </div>

          <div>
            <label className="block text-[#014F86] text-base mb-2 font-sans" htmlFor="date">
              Date
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={currentEvent.date}
              onChange={handleInputChange}
              min={new Date().toISOString().split('T')[0]}
              className="shadow border border-[#014F86]/30 rounded-xl w-full py-3 px-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1] transition font-sans"
              required
              onKeyDown={(e) => e.preventDefault()}
              onInput={(e) => {
                const selectedDate = e.target.value;
                if (isDateDisabled(selectedDate)) {
                  e.target.value = currentEvent.date;
                  setDateValidationModal({
                    show: true,
                    message: 'Weekends and holidays are not allowed. Please choose a weekday.'
                  });
                }
              }}
            />
            <div className="mt-2">
              <p className="text-xs text-gray-600 font-sans">
                Weekends and holidays are not available for scheduling
              </p>
              {currentEvent.date && isDateDisabled(currentEvent.date) && (
                <div className="flex items-center mt-1 text-red-600">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-xs font-sans">Invalid date selected</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[#014F86] text-base mb-2 font-sans" htmlFor="time">
              Time
            </label>
            <input
              type="time"
              id="time"
              name="time"
              value={currentEvent.time}
              onChange={handleInputChange}
              className="shadow border border-[#014F86]/30 rounded-xl w-full py-3 px-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1] transition font-sans"
              required
            />
          </div>

          <div>
            <label className="block text-[#014F86] text-base mb-2 font-sans" htmlFor="location">
              Venue
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={currentEvent.location}
              onChange={handleInputChange}
              className="shadow border border-[#014F86]/30 rounded-xl w-full py-3 px-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1] transition font-sans"
              required
            />
          </div>

          <div>
            <label className="block text-[#014F86] text-base mb-2 font-sans" htmlFor="status">
              Status
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="status"
                name="status"
                className="sr-only peer"
                checked={currentEvent.status === 'on'}
                onChange={(e) => handleInputChange({
                  target: {
                    name: 'status',
                    value: e.target.checked ? 'on' : 'off'
                  }
                })}
              />
              <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4169E1]/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-[#014F86]/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4169E1]"></div>
              <span className="ml-4 text-base text-[#014F86] font-sans">
                {currentEvent.status === 'on' ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>

          <div>
            <label className="block text-[#014F86] text-base mb-2 font-sans" htmlFor="eventImage">
              Event Image
            </label>
            <input
              type="file"
              id="eventImage"
              accept="image/*"
              onChange={handleEventImageUpload}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#4169E1] file:text-white hover:file:bg-[#014F86] cursor-pointer"
            />
            {uploadingImage && (
              <p className="text-sm text-gray-500 mt-2 font-sans">Uploading image...</p>
            )}
            {currentEvent.imageUrl && (
              <img
                src={currentEvent.imageUrl}
                alt="Event"
                className="mt-3 w-full max-h-40 object-cover rounded-xl border border-[#014F86]/20"
              />
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-[#014F86] text-base mb-2 font-sans" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={currentEvent.description}
              onChange={handleInputChange}
              className="shadow border border-[#014F86]/30 rounded-xl w-full py-3 px-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1] transition font-sans"
              rows="4"
              required
            ></textarea>
          </div>
        </div>

        <div className="flex justify-end mt-10 gap-4">
          <button
            type="button"
            onClick={closeModal}
            className="bg-gray-100 hover:bg-[#FFC30B] text-[#014F86] py-2 px-8 rounded-xl transition-colors border border-[#014F86]/20 shadow font-sans"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-[#4169E1] hover:bg-[#014F86] text-white py-2 px-8 rounded-xl transition-colors border-2 border-[#FFC30B] shadow-lg font-sans"
          >
            {formMode === 'add' ? 'Create Event' : 'Update Event'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* Delete Confirmation Modal */}
{deleteConfirmModal.show && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0 w-10 h-10 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-gray-900 font-sans">
            Delete this event?
          </h3>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-6 font-sans">
        Are you sure you want to delete "{deleteConfirmModal.eventTitle}"? This action cannot be undone.
      </p>
      <div className="flex justify-end space-x-3">
        <button
          onClick={cancelDeleteEvent}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors font-sans"
        >
          No
        </button>
        <button
          onClick={confirmDeleteEvent}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors font-sans"
        >
          Yes
        </button>
      </div>
    </div>
  </div>
)}

{/* Date Validation Modal */}
{dateValidationModal.show && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 border-t-8 border-amber-400">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mb-4">
          <svg className="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2 font-sans">
          Date Selection Warning
        </h3>
        <p className="text-gray-600 mb-6 font-sans">
          {dateValidationModal.message}
        </p>
        <button
          onClick={() => setDateValidationModal({ show: false, message: '' })}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 font-sans"
        >
          OK
        </button>
      </div>
    </div>
  </div>
)}  

    </div>
  </>
  );
};

export default AdminEventManagement;