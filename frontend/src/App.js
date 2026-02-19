import React, { useState, useEffect, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

// ==========================================
// 1. CONFIGURATION & CONSTANTS
// ==========================================

// Theme Colors
const themeColors = {
  light: {
    primary: '#0056b3', secondary: '#6c757d', success: '#28a745', danger: '#dc3545',
    warning: '#ffc107', info: '#17a2b8', light: '#f8f9fa', dark: '#343a40',
    background: '#ffffff', text: '#212529', cardBg: '#ffffff', border: '#dee2e6'
  },
  dark: {
    primary: '#0d6efd', secondary: '#6c757d', success: '#198754', danger: '#dc3545',
    warning: '#ffc107', info: '#0dcaf0', light: '#f8f9fa', dark: '#212529',
    background: '#121212', text: '#f8f9fa', cardBg: '#1e1e1e', border: '#343a40'
  }
};

// Animation Variants
const pageTransition = {
  initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }
};

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

// ==========================================
// 2. CONTEXTS
// ==========================================

const NotificationContext = React.createContext();

const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 5s
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1050 }}>
        {notifications.map(n => (
          <motion.div 
            key={n.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={`alert alert-${n.type} shadow-sm mb-2`}
          >
            {n.message}
          </motion.div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

// ==========================================
// 3. SHARED UI COMPONENTS
// ==========================================

const Spinner = () => <div className="spinner-border spinner-border-sm me-2" role="status"></div>;

const AnimatedCard = ({ children, delay }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });
  return (
    <motion.div ref={ref} variants={cardVariants} initial="hidden" animate={inView ? 'visible' : 'hidden'} transition={{ delay }}>
      {children}
    </motion.div>
  );
};

const Navbar = ({ user, currentPage, setCurrentPage, handleLogout, toggleTheme, theme }) => {
  const colors = themeColors[theme];
  return (
    <motion.nav 
      className="navbar navbar-expand-lg navbar-dark shadow-sm sticky-top"
      style={{ backgroundColor: colors.primary }}
      initial={{ y: -100 }} animate={{ y: 0 }}
    >
      <div className="container-fluid">
        <a className="navbar-brand fw-bold" href="#" onClick={() => setCurrentPage('home')}>
          <i className="bi bi-car-front-fill me-2"></i>RIDA
        </a>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            {user && (
              <>
                <li className="nav-item">
                  <button className="nav-link btn btn-link" onClick={() => setCurrentPage('home')}>Home</button>
                </li>
                {user.userType === 'admin' && <li><button className="nav-link btn btn-link" onClick={() => setCurrentPage('adminDashboard')}>Admin Dashboard</button></li>}
                {user.userType === 'customer' && <li><button className="nav-link btn btn-link" onClick={() => setCurrentPage('customerDashboard')}>Book Driver</button></li>}
                {user.userType === 'driver' && <li><button className="nav-link btn btn-link" onClick={() => setCurrentPage('driverDashboard')}>My Assignments</button></li>}
              </>
            )}
          </ul>
          <div className="d-flex align-items-center gap-3">
            <button className="btn btn-outline-light btn-sm" onClick={toggleTheme}>
              <i className={`bi ${theme === 'light' ? 'bi-moon-fill' : 'bi-sun-fill'}`}></i>
            </button>
            {user ? (
              <div className="dropdown">
                <button className="btn btn-outline-light dropdown-toggle" type="button" id="userDropdown" data-bs-toggle="dropdown">
                  {user.name}
                </button>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li><button className="dropdown-item" onClick={handleLogout}>Logout</button></li>
                </ul>
              </div>
            ) : (
              <button className="btn btn-light" onClick={() => setCurrentPage('login')}>Login</button>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

// ==========================================
// 4. PAYMENT COMPONENT (Flutterwave)
// ==========================================

const FlutterWavePaymentButton = ({ amount, email, phone, name, onSuccess, onClose }) => {
  const [isPaying, setIsPaying] = useState(false);

  const handlePayment = async () => {
    setIsPaying(true);
    
    // 1. Load Flutterwave Inline Script dynamically
    const script = document.createElement('script');
    script.src = 'https://checkout.flutterwave.com/v3.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      // 2. Initialize Payment
      if (window.FlutterwaveCheckout) {
        window.FlutterwaveCheckout({
          public_key: process.env.REACT_APP_FLW_PUBLIC_KEY, // FROM .env
          tx_ref: `RID-${Date.now()}`,
          amount: amount,
          currency: 'RWF',
          payment_options: 'card, mobilemoneyrwanda, mobilemoneyuganda, mobilemoneykenya', // Focus on MoMo
          customer: {
            email: email,
            phone_number: phone,
            name: name,
          },
          customizations: {
            title: 'RIDA Driver Booking',
            description: 'Payment for Driver Service',
            logo: 'https://yourlogo.com/logo.png', // Replace with your logo URL
          },
          callback: (response) => {
            console.log("Payment response:", response);
            if (response.status === 'successful') {
              onSuccess(response); // Pass transaction details back
            } else {
              onClose();
            }
            setIsPaying(false);
          },
          onclose: () => {
            setIsPaying(false);
            onClose();
          }
        });
      }
    };
    script.onerror = () => {
      console.error("Failed to load Flutterwave script");
      setIsPaying(false);
    };
  };

  return (
    <motion.button 
      className="btn btn-success w-100 py-2 fw-bold" 
      onClick={handlePayment}
      disabled={isPaying}
      whileHover={{ scale: 1.02 }}
    >
      {isPaying ? <Spinner /> : <i className="bi bi-credit-card me-2"></i>}
      {isPaying ? 'Processing...' : `Pay ${amount.toLocaleString()} RWF`}
    </motion.button>
  );
};

// ==========================================
// 5. PAGE COMPONENTS
// ==========================================

// --- HOMEPAGE ---
const HomePage = ({ setCurrentPage, theme }) => (
  <div className="container py-5 text-center">
    <motion.h1 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="display-4 fw-bold mb-4">
      Welcome to RIDA
    </motion.h1>
    <p className="lead text-muted mb-5">Your Trusted Driver Booking Platform.</p>
    <div className="d-flex justify-content-center gap-3">
      <motion.button className="btn btn-primary btn-lg px-5" onClick={() => setCurrentPage('register')} whileHover={{ scale: 1.05 }}>Get Started</motion.button>
      <motion.button className="btn btn-outline-secondary btn-lg px-5" onClick={() => setCurrentPage('login')} whileHover={{ scale: 1.05 }}>Login</motion.button>
    </div>
  </div>
);

// --- CUSTOMER DASHBOARD (With Payment Integration) ---
const CustomerDashboard = ({ user, token, showMessage, theme }) => {
  const colors = themeColors[theme];
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({ days: 1, address: '' });
  
  // Calculator Logic
  const fare = bookingDetails.days === 1 ? 15000 : bookingDetails.days * 10000;

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/api/drivers/all-drivers`)
      .then(res => res.json())
      .then(data => { setDrivers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => showMessage('Failed to load drivers', 'danger'));
  }, [showMessage]);

  const handlePaymentSuccess = async (paymentResponse) => {
    showMessage('Payment Successful! Creating booking...', 'success');
    
    // Now create the booking in your DB
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          driverId: selectedDriver._id,
          pickupLocation: { address: bookingDetails.address },
          scheduledTime: new Date().toISOString(), // Logic for scheduling needed
          pricing: { totalAmount: fare },
          paymentReference: paymentResponse.transaction_id, // Save Flutterwave ID
          paymentStatus: 'paid'
        })
      });
      
      if (res.ok) {
        showMessage('Booking confirmed!', 'success');
        setSelectedDriver(null);
      } else {
        showMessage('Booking creation failed after payment.', 'danger');
      }
    } catch (err) {
      showMessage('Error creating booking.', 'danger');
    }
  };

  if (loading) return <div className="text-center p-5"><Spinner /></div>;

  return (
    <div className="container-fluid p-4">
      <div className="row mb-4">
        <div className="col-12">
          <h2>Available Drivers</h2>
          <p className="text-muted">Select a driver to book and pay securely via MoMo or Card.</p>
        </div>
      </div>

      {/* Drivers List */}
      <div className="row g-4">
        {drivers.map((driver, i) => (
          <div key={driver._id} className="col-md-4">
            <AnimatedCard delay={i * 0.1}>
              <div className="card shadow-sm h-100" style={{ backgroundColor: colors.cardBg }}>
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="rounded-circle bg-primary bg-opacity-25 p-3 me-3">
                      <i className="bi bi-person-fill fs-4 text-primary"></i>
                    </div>
                    <div>
                      <h5 className="mb-1">{driver.user?.name}</h5>
                      <span className={`badge ${driver.availability?.isAvailable ? 'bg-success' : 'bg-secondary'}`}>
                        {driver.availability?.isAvailable ? 'Available' : 'Busy'}
                      </span>
                    </div>
                  </div>
                  <p className="text-muted small"><i className="bi bi-car-front me-2"></i>{driver.vehicle?.make} {driver.vehicle?.model}</p>
                  <button className="btn btn-outline-primary w-100" onClick={() => setSelectedDriver(driver)} disabled={!driver.availability?.isAvailable}>
                    Book Now
                  </button>
                </div>
              </div>
            </AnimatedCard>
          </div>
        ))}
      </div>

      {/* Booking & Payment Modal */}
      {selectedDriver && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ backgroundColor: colors.cardBg }}>
              <div className="modal-header">
                <h5 className="modal-title">Book: {selectedDriver.user?.name}</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedDriver(null)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Pickup Address</label>
                  <input type="text" className="form-control" placeholder="Where should the driver meet you?" 
                    onChange={(e) => setBookingDetails({...bookingDetails, address: e.target.value})} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Number of Days</label>
                  <input type="number" className="form-control" value={bookingDetails.days} min="1"
                    onChange={(e) => setBookingDetails({...bookingDetails, days: parseInt(e.target.value)})} />
                </div>
                <div className="alert alert-info d-flex justify-content-between">
                  <span>Total Fare:</span>
                  <strong>{fare.toLocaleString()} RWF</strong>
                </div>
                
                {/* PAYMENT BUTTON */}
                <FlutterWavePaymentButton 
                  amount={fare}
                  email={user.email}
                  phone={user.phone}
                  name={user.name}
                  onSuccess={handlePaymentSuccess}
                  onClose={() => console.log("Payment closed")}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- ADMIN DASHBOARD ---
const AdminDashboard = ({ user, token, showMessage, theme }) => {
  const colors = themeColors[theme];
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ users: 0, drivers: 0, revenue: 0 });
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    // Fetch Admin Data
    const headers = { 'Authorization': `Bearer ${token}` };
    
    Promise.all([
      fetch(`${process.env.REACT_APP_API_URL}/api/admin/users`, { headers }).then(r => r.json()),
      fetch(`${process.env.REACT_APP_API_URL}/api/admin/bookings`, { headers }).then(r => r.json())
    ]).then(([users, bookingsData]) => {
      setStats({ 
        users: users.length, 
        drivers: users.filter(u => u.userType === 'driver').length, 
        revenue: bookingsData.reduce((acc, b) => acc + (b.pricing?.totalAmount || 0), 0)
      });
      setBookings(bookingsData);
    }).catch(() => showMessage("Failed to load admin data", "danger"));
  }, [token, showMessage]);

  return (
    <div className="row g-0 min-vh-100">
      {/* Sidebar */}
      <div className="col-md-2 bg-dark text-white p-3">
        <h4 className="mb-4">Admin Panel</h4>
        <div className="nav flex-column">
          {['dashboard', 'bookings', 'users'].map(tab => (
            <button key={tab} className={`btn btn-link text-white text-start nav-link ${activeTab === tab ? 'active bg-primary' : ''}`} onClick={() => setActiveTab(tab)}>
              <i className={`bi bi-${tab === 'dashboard' ? 'speedometer2' : tab === 'bookings' ? 'receipt' : 'people'} me-2`}></i>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="col-md-10 p-4" style={{ backgroundColor: colors.background, color: colors.text }}>
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="mb-4">Overview</h2>
            <div className="row g-4">
              <div className="col-md-4">
                <div className="card shadow-sm" style={{ backgroundColor: colors.cardBg }}>
                  <div className="card-body"><h5>Total Users</h5><h2>{stats.users}</h2></div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow-sm" style={{ backgroundColor: colors.cardBg }}>
                  <div className="card-body"><h5>Total Drivers</h5><h2>{stats.drivers}</h2></div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow-sm" style={{ backgroundColor: colors.cardBg }}>
                  <div className="card-body"><h5>Total Revenue</h5><h2>{stats.revenue.toLocaleString()} RWF</h2></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'bookings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="mb-4">Recent Bookings</h2>
            <div className="table-responsive">
              <table className="table table-hover" style={{ color: colors.text }}>
                <thead><tr><th>ID</th><th>Customer</th><th>Amount</th><th>Payment Status</th><th>Date</th></tr></thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b._id}>
                      <td>{b._id.substring(0, 8)}...</td>
                      <td>{b.customer?.name || 'N/A'}</td>
                      <td>{b.pricing?.totalAmount?.toLocaleString()} RWF</td>
                      <td>
                        <span className={`badge bg-${b.paymentStatus === 'paid' ? 'success' : 'warning'}`}>
                          {b.paymentStatus || 'pending'}
                        </span>
                      </td>
                      <td>{new Date(b.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// --- DRIVER DASHBOARD & AUTH (Simplified for brevity) ---
const DriverDashboard = ({ user, token, theme }) => <div className="p-5">Driver Dashboard</div>;

const Login = ({ onLogin, showMessage }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) onLogin(data);
      else showMessage(data.msg || 'Login failed', 'danger');
    } catch { showMessage('Network error', 'danger'); }
  };
  return (
    <div className="container py-5" style={{ maxWidth: '400px' }}>
      <div className="card shadow"><div className="card-body p-4">
        <h3 className="mb-4 text-center">Login</h3>
        <form onSubmit={handleSubmit}>
          <input type="email" className="form-control mb-3" placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} required />
          <input type="password" className="form-control mb-3" placeholder="Password" onChange={e => setForm({...form, password: e.target.value})} required />
          <button className="btn btn-primary w-100">Login</button>
        </form>
      </div></div>
    </div>
  );
};

const Register = ({ setCurrentPage, showMessage }) => <div className="container p-5"><button onClick={() => setCurrentPage('login')}>Go to Login</button></div>;

// ==========================================
// 6. MAIN APP CONTROLLER
// ==========================================

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [currentPage, setCurrentPage] = useState('home');
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load Bootstrap & Icons
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css';
    document.head.appendChild(link);
    const icons = document.createElement('link');
    icons.rel = 'stylesheet';
    icons.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
    document.head.appendChild(icons);

    // Check Auth
    if (token) {
      fetch(`${process.env.REACT_APP_API_URL}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` }})
        .then(res => res.json())
        .then(data => { if (data.user) setUser(data.user); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleLogin = (data) => {
    localStorage.setItem('authToken', data.token);
    setToken(data.token);
    setUser(data.user);
    setCurrentPage('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setToken(null);
    setCurrentPage('home');
  };

  if (loading) return <div className="vh-100 d-flex align-items-center justify-content-center"><Spinner /></div>;

  return (
    <NotificationProvider>
      <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: themeColors[theme].background, color: themeColors[theme].text }}>
        <Navbar user={user} currentPage={currentPage} setCurrentPage={setCurrentPage} handleLogout={handleLogout} toggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')} theme={theme} />
        
        <main className="flex-grow-1">
          <AnimatePresence mode="wait">
            {!user ? (
              <>
                {currentPage === 'login' && <Login onLogin={handleLogin} />}
                {currentPage === 'register' && <Register setCurrentPage={setCurrentPage} />}
                {(currentPage === 'home' || !['login', 'register'].includes(currentPage)) && <HomePage setCurrentPage={setCurrentPage} theme={theme} />}
              </>
            ) : (
              <motion.div key={currentPage} initial="initial" animate="animate" exit="exit" variants={pageTransition}>
                {user.userType === 'admin' && (currentPage === 'adminDashboard' || currentPage === 'home') && <AdminDashboard user={user} token={token} theme={theme} />}
                {user.userType === 'customer' && (currentPage === 'customerDashboard' || currentPage === 'home') && <CustomerDashboard user={user} token={token} theme={theme} />}
                {user.userType === 'driver' && (currentPage === 'driverDashboard' || currentPage === 'home') && <DriverDashboard user={user} token={token} theme={theme} />}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </NotificationProvider>
  );
}
