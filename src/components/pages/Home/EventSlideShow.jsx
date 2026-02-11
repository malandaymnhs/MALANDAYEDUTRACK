import { useState, useEffect } from 'react';
import axios from 'axios';

const EventSlideShow = () => {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        const response = await axios.get('/api/events/upcoming');
        // Sort events by date descending (latest to oldest)
        const sorted = response.data.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
        setUpcomingEvents(sorted);
      } catch (error) {
        console.error("Error fetching upcoming events:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUpcomingEvents();
  }, []);

  const nextSlide = () => {
    setActiveIndex(prev => (prev + 1) % Math.ceil(upcomingEvents.length / 3));
  };

  const prevSlide = () => {
    setActiveIndex(prev => (prev - 1 + Math.ceil(upcomingEvents.length / 3)) % Math.ceil(upcomingEvents.length / 3));
  };

  if (loading) return <div className="text-center py-8">Loading events...</div>;
  if (upcomingEvents.length === 0) return null;

  const visibleEvents = upcomingEvents.slice(activeIndex * 3, activeIndex * 3 + 3);

  return (
    <section className="py-16 bg-blue-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Upcoming Events</h2>
        
        <div className="relative">
          {upcomingEvents.length > 3 && (
            <>
              <button 
                onClick={prevSlide}
                className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-10 bg-white p-3 rounded-full shadow-lg hover:bg-blue-100"
              >
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                onClick={nextSlide}
                className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-10 bg-white p-3 rounded-full shadow-lg hover:bg-blue-100"
              >
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {visibleEvents.map(event => (
              <div key={event._id} className="bg-white rounded-xl shadow-lg overflow-hidden transition-transform hover:scale-105">
                <div className="h-64 overflow-hidden">
                  <img 
                    src={event.image || '/mnhslogo.jpg'} 
                    alt={event.title}
                    className="w-full h-full object-cover"
                    onError={(e) => e.target.src = '/mnhslogo.jpg'}
                  />
                </div>
                <div className="p-6">
                  <div className="text-sm text-blue-600 mb-2">
                    {new Date(event.date).toLocaleDateString()}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                  <p className="text-gray-600 mb-4">{event.description}</p>
                  <button className="text-blue-600 font-medium hover:text-blue-800">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventSlideShow;