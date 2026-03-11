import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBed, FaChair, FaTable, FaDoorClosed,
  FaSearch, FaFilter, FaStar, FaClock,
  FaShoppingCart, FaEye, FaCartPlus, FaPhotoVideo, FaTools, FaHeart, FaRegHeart
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { serviceService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getServiceMediaList, isVideoAsset, resolveServiceMediaAsset } from '../utils/serviceMedia';
import { SERVICE_OFFERING_OPTIONS, normalizeOfferings } from '../utils/serviceOfferings';
import './Services.css';

const categories = [
  { id: 'all', name: 'All Categories', icon: <FaFilter /> },
  { id: 'bedroom', name: 'Bedroom', icon: <FaBed /> },
  { id: 'dining', name: 'Dining', icon: <FaTable /> },
  { id: 'living', name: 'Living Room', icon: <FaChair /> },
  { id: 'office', name: 'Office', icon: <FaDoorClosed /> },
  { id: 'storage', name: 'Storage', icon: <FaDoorClosed /> }
];

const Services = () => {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedOffering, setSelectedOffering] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [reviewForm, setReviewForm] = useState({ rating: '5', comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const loadServices = async () => {
      try {
        const data = await serviceService.getAllServices();
        setServices(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error('Failed to load services');
      } finally {
        setLoading(false);
      }
    };
    loadServices();
  }, []);

  useEffect(() => {
    if (!user) {
      setFavoriteIds([]);
      setFavoritesOnly(false);
      return;
    }

    const loadFavorites = async () => {
      try {
        const data = await serviceService.getFavorites();
        const ids = Array.isArray(data?.favorites)
          ? data.favorites.map((id) => String(id))
          : [];
        setFavoriteIds(ids);
      } catch (error) {
        toast.error('Failed to load favorites');
      }
    };

    loadFavorites();
  }, [user]);

  useEffect(() => {
    if (!selectedService) return;
    const mediaList = getServiceMedia(selectedService);
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedService(null);
        return;
      }
      if (mediaList.length < 2) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedMediaIndex((prev) => (prev + 1) % mediaList.length);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedMediaIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedService]);

  useEffect(() => {
    setSelectedMediaIndex(0);
  }, [selectedService]);

  useEffect(() => {
    if (!selectedService) return;
    setReviewForm({ rating: '5', comment: '' });
  }, [selectedService]);

  const formatPrice = (price) => {
    if (price === undefined || price === null || price === '') return 'Rs 0';
    if (typeof price === 'number') return `Rs ${price.toLocaleString()}`;
    return String(price);
  };

  const placeholderImage = 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600';
  const getServiceMedia = (service) => getServiceMediaList(service);
  const resolveAsset = (url) => resolveServiceMediaAsset(url);
  const renderMedia = ({ src, alt, className, muted = true, controls = false }) => {
    if (!src) {
      return <img src={placeholderImage} alt={alt} className={className} />;
    }

    if (isVideoAsset(src)) {
      return (
        <video
          src={resolveAsset(src)}
          className={className}
          muted={muted}
          controls={controls}
          playsInline
          preload="metadata"
        />
      );
    }

    return <img src={resolveAsset(src)} alt={alt} className={className} />;
  };

  const getServiceId = (service) => service?._id || service?.id || '';
  const getServiceReviews = (service) => (Array.isArray(service?.reviews) ? service.reviews : []);
  const getAverageRating = (service) => {
    const reviews = getServiceReviews(service);
    if (reviews.length > 0) {
      const total = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0);
      return total / reviews.length;
    }
    if (service?.rating) return Number(service.rating);
    return 4.5;
  };
  const getRatingCount = (service) => getServiceReviews(service).length;
  const formatReviewDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const categoryCounts = useMemo(() => {
    const counts = categories.reduce((acc, category) => {
      acc[category.id] = 0;
      return acc;
    }, {});

    services.forEach((service) => {
      const category = service.category || '';
      if (counts[category] !== undefined) {
        counts[category] += 1;
      }
    });

    counts.all = services.length;
    return counts;
  }, [services]);

  const offeringCounts = useMemo(() => {
    const counts = SERVICE_OFFERING_OPTIONS.reduce((acc, option) => {
      acc[option.id] = 0;
      return acc;
    }, {});

    services.forEach((service) => {
      normalizeOfferings(service.offerings).forEach((id) => {
        if (counts[id] !== undefined) {
          counts[id] += 1;
        }
      });
    });

    return counts;
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const name = service.name || '';
      const description = service.description || '';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
      const matchesOffering = selectedOffering === 'all' ||
        normalizeOfferings(service.offerings).includes(selectedOffering);
      const matchesFavorites = !favoritesOnly || favoriteIds.includes(getServiceId(service));
      return matchesSearch && matchesCategory && matchesOffering && matchesFavorites;
    });
  }, [services, searchTerm, selectedCategory, selectedOffering, favoritesOnly, favoriteIds]);

  const handleViewDetails = (service) => {
    setSelectedService(service);
  };

  const closeModal = () => {
    setSelectedService(null);
  };

  const handleAddToCart = (service) => {
    if (!isLoggedIn) {
      toast.info('Please login to add items to your cart');
      navigate('/login');
      return;
    }

    addToCart({
      _id: service._id || service.id || `${service.name}-${service.category}`,
      name: service.name,
      category: service.category,
      price: formatPrice(service.price),
      image: resolveAsset(getServiceMedia(service)[0]) || placeholderImage
    });
  };

  const handleToggleFavorite = async (service) => {
    if (!isLoggedIn) {
      toast.info('Please login to save favorites');
      navigate('/login');
      return;
    }

    const serviceId = getServiceId(service);
    if (!serviceId) return;

    try {
      const response = await serviceService.toggleFavorite(serviceId);
      const ids = Array.isArray(response?.favorites)
        ? response.favorites.map((id) => String(id))
        : [];
      setFavoriteIds(ids);
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const isStaff = user?.role === 'admin' || user?.role === 'employee';
  const handleOrderNow = (service) => {
    if (!isLoggedIn) {
      navigate('/register');
      return;
    }
    handleAddToCart(service);
    navigate('/cart');
  };

  const handleRequestCustomizationForService = (service) => {
    if (!isLoggedIn) {
      toast.info('Please login to request a customization');
      navigate('/register');
      return;
    }
    const params = new URLSearchParams();
    if (service?.name) params.set('serviceName', service.name);
    if (service?.category) params.set('category', service.category);
    const query = params.toString();
    navigate(query ? `/custom-order?${query}` : '/custom-order');
  };

  const handleReviewSubmit = async () => {
    if (!selectedService) return;
    if (!isLoggedIn) {
      toast.info('Please login to leave a review');
      navigate('/login');
      return;
    }
    if (user?.role !== 'customer') {
      toast.info('Only customers can leave reviews');
      return;
    }

    const ratingValue = Number(reviewForm.rating);
    if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
      toast.error('Please select a rating between 1 and 5');
      return;
    }

    setReviewSubmitting(true);
    try {
      const serviceId = getServiceId(selectedService);
      const response = await serviceService.addReview(serviceId, {
        rating: ratingValue,
        comment: reviewForm.comment.trim()
      });
      const updatedReviews = Array.isArray(response?.reviews) ? response.reviews : [];
      setServices((prev) => prev.map((item) => (
        getServiceId(item) === serviceId ? { ...item, reviews: updatedReviews } : item
      )));
      setSelectedService((prev) => (prev ? { ...prev, reviews: updatedReviews } : prev));
      setReviewForm({ rating: '5', comment: '' });
      toast.success('Thanks for your feedback!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const tabItems = [
    { id: 'all', label: 'All', type: 'all', count: services.length },
    { id: 'favorites', label: 'Favorites', type: 'favorites', count: favoriteIds.length },
    ...categories
      .filter((category) => category.id !== 'all')
      .map((category) => ({
        id: category.id,
        label: category.name,
        type: 'category',
        count: categoryCounts[category.id] || 0
      })),
    ...SERVICE_OFFERING_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
      type: 'offering',
      count: offeringCounts[option.id] || 0
    }))
  ];

  const isTabActive = (tab) => {
    if (tab.type === 'all') {
      return selectedCategory === 'all' && selectedOffering === 'all' && !favoritesOnly;
    }
    if (tab.type === 'favorites') {
      return favoritesOnly;
    }
    if (tab.type === 'category') {
      return selectedCategory === tab.id && selectedOffering === 'all' && !favoritesOnly;
    }
    if (tab.type === 'offering') {
      return selectedOffering === tab.id && selectedCategory === 'all' && !favoritesOnly;
    }
    return false;
  };

  const handleTabSelect = (tab) => {
    if (tab.type === 'all') {
      setSelectedCategory('all');
      setSelectedOffering('all');
      setFavoritesOnly(false);
      return;
    }
    if (tab.type === 'favorites') {
      if (!isLoggedIn) {
        toast.info('Please login to view favorites');
        navigate('/login');
        return;
      }
      setFavoritesOnly(true);
      setSelectedCategory('all');
      setSelectedOffering('all');
      return;
    }
    if (tab.type === 'category') {
      setSelectedCategory(tab.id);
      setSelectedOffering('all');
      setFavoritesOnly(false);
      return;
    }
    if (tab.type === 'offering') {
      setSelectedOffering(tab.id);
      setSelectedCategory('all');
      setFavoritesOnly(false);
    }
  };

  const selectedServiceMedia = selectedService ? getServiceMedia(selectedService) : [];
  const activeSelectedMedia = selectedServiceMedia[selectedMediaIndex] || selectedServiceMedia[0] || '';
  const canNavigateMedia = selectedServiceMedia.length > 1;

  const handlePrevMedia = () => {
    if (!canNavigateMedia) return;
    setSelectedMediaIndex((prev) => (prev - 1 + selectedServiceMedia.length) % selectedServiceMedia.length);
  };

  const handleNextMedia = () => {
    if (!canNavigateMedia) return;
    setSelectedMediaIndex((prev) => (prev + 1) % selectedServiceMedia.length);
  };

  const handleTouchStart = (event) => {
    if (!canNavigateMedia) return;
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event) => {
    if (!canNavigateMedia) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (deltaX < 0) {
      handleNextMedia();
    } else {
      handlePrevMedia();
    }
  };

  return (
    <div className="services-container">
      <div className="services-hero">
        <h1>Our Carpentry Services</h1>
        <p>Custom furniture crafted with precision, care, and years of expertise</p>
      </div>

      <div className="search-filter-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="offerings-filter">
          <div className="offerings-tabs">
            {tabItems.map((tab) => (
              <button
                key={`${tab.type}-${tab.id}`}
                type="button"
                className={`offerings-tab ${isTabActive(tab) ? 'active' : ''}`}
                onClick={() => handleTabSelect(tab)}
              >
                <span>{tab.label}</span>
                <span className="tab-count">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="services-grid">
        {loading ? (
          <div className="no-results">
            <h3>Loading services...</h3>
          </div>
        ) : filteredServices.length > 0 ? (
          filteredServices.map((service) => {
            const averageRating = getAverageRating(service);
            const ratingCount = getRatingCount(service);
            const isFavorite = favoriteIds.includes(getServiceId(service));
            return (
            <div key={service._id || service.id} className="service-card">
              <div className="service-image">
                {renderMedia({
                  src: getServiceMedia(service)[0],
                  alt: service.name,
                  className: 'service-media-asset'
                })}
                <div className="service-badge">{service.category || 'custom'}</div>
                {getServiceMedia(service).length > 1 && (
                  <div className="service-media-count">
                    <FaPhotoVideo />
                    <span>{getServiceMedia(service).length}</span>
                  </div>
                )}
              </div>

              <div className="service-content">
                <div className="service-header">
                  <h3>{service.name}</h3>
                  <div className="service-header-actions">
                    <div className="service-rating">
                      <FaStar className="star-icon" />
                      <span>{averageRating.toFixed(1)}</span>
                      {ratingCount > 0 && (
                        <span className="review-count">({ratingCount})</span>
                      )}
                    </div>
                    {!isStaff && (
                      <button
                        type="button"
                        className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                        onClick={() => handleToggleFavorite(service)}
                        aria-pressed={isFavorite}
                        aria-label="Toggle favorite"
                      >
                        {isFavorite ? <FaHeart /> : <FaRegHeart />}
                      </button>
                    )}
                  </div>
                </div>

                <p className="service-description">{service.description}</p>

                <div className="service-features">
                  {(Array.isArray(service.features) ? service.features : service.features ? [service.features] : []).map((feature, index) => (
                    <span key={index} className="feature-tag">{feature}</span>
                  ))}
                </div>

                <div className="service-details">
                  <div className="detail-item">
                    <FaClock className="detail-icon" />
                    <span>{service.timeline || '2-4 weeks'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="price">{formatPrice(service.price)}</span>
                  </div>
                </div>

                <div className="service-actions">
                  {!isStaff && (
                    <>
                      <button
                        type="button"
                        className="btn-order"
                        onClick={() => handleOrderNow(service)}
                      >
                        <FaShoppingCart />
                        <span>{isLoggedIn ? 'Order Now' : 'Register to Order'}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-custom"
                        onClick={() => handleRequestCustomizationForService(service)}
                      >
                        <FaTools />
                        <span>Request Customization</span>
                      </button>
                      <button className="btn-cart" onClick={() => handleAddToCart(service)}>
                        <FaCartPlus />
                        <span>Add to Cart</span>
                      </button>
                    </>
                  )}
                  <button className="btn-view" onClick={() => handleViewDetails(service)}>
                    <FaEye />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            </div>
          );
          })
        ) : (
          <div className="no-results">
            <h3>No services found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      <div className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Browse & Select</h3>
            <p>Explore our services and choose what you need</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Customize</h3>
            <p>Specify dimensions, materials, and design preferences</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Get Quote</h3>
            <p>Receive a detailed quotation for your project</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Track Progress</h3>
            <p>Monitor your order through every production stage</p>
          </div>
        </div>
      </div>

      {selectedService && (
        <div className="service-modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="service-modal" onClick={(event) => event.stopPropagation()}>
            <div
              className="service-modal-image"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {renderMedia({
                src: activeSelectedMedia,
                alt: selectedService.name,
                className: 'service-modal-asset',
                muted: false,
                controls: isVideoAsset(activeSelectedMedia)
              })}
              {canNavigateMedia && (
                <>
                  <button
                    type="button"
                    className="media-nav prev"
                    onClick={handlePrevMedia}
                    aria-label="Previous media"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="media-nav next"
                    onClick={handleNextMedia}
                    aria-label="Next media"
                  >
                    ›
                  </button>
                  <div className="media-counter">
                    {selectedMediaIndex + 1} / {selectedServiceMedia.length}
                  </div>
                </>
              )}
            </div>
            <div className="service-modal-content">
              <div className="service-modal-header">
                <div>
                  <h2>{selectedService.name}</h2>
                </div>
                <span className="service-modal-badge">{selectedService.category || 'custom'}</span>
              </div>

              <div className="service-modal-meta">
                <span><strong>Price:</strong> {formatPrice(selectedService.price)}</span>
                <span><strong>Timeline:</strong> {selectedService.timeline || '2-4 weeks'}</span>
                <span>
                  <strong>Rating:</strong> {getAverageRating(selectedService).toFixed(1)}
                  {getRatingCount(selectedService) > 0 ? ` (${getRatingCount(selectedService)} reviews)` : ''}
                </span>
              </div>

              <p className="service-description">{selectedService.description}</p>

              {selectedServiceMedia.length > 1 && (
                <div className="service-gallery">
                  <h3>Gallery</h3>
                  <div className="service-gallery-grid">
                    {selectedServiceMedia.map((mediaItem, index) => (
                      <button
                        type="button"
                        key={`${mediaItem}-${index}`}
                        className={`service-gallery-item ${selectedMediaIndex === index ? 'active' : ''}`}
                        onClick={() => setSelectedMediaIndex(index)}
                      >
                        {renderMedia({
                          src: mediaItem,
                          alt: `${selectedService.name} gallery ${index + 1}`,
                          className: 'service-gallery-thumb'
                        })}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="service-features">
                {(Array.isArray(selectedService.features) ? selectedService.features : selectedService.features ? [selectedService.features] : [])
                  .map((feature, index) => (
                    <span key={index} className="feature-tag">{feature}</span>
                  ))}
              </div>

              <div className="service-reviews">
                <div className="service-reviews-header">
                  <h3>Customer reviews</h3>
                  <span className="review-summary">
                    {getRatingCount(selectedService) > 0
                      ? `${getAverageRating(selectedService).toFixed(1)} avg · ${getRatingCount(selectedService)} reviews`
                      : 'No reviews yet'}
                  </span>
                </div>

                {getServiceReviews(selectedService).length > 0 ? (
                  <div className="review-list">
                    {getServiceReviews(selectedService).slice(0, 4).map((review, index) => (
                      <div key={`${review.userId}-${index}`} className="review-item">
                        <div className="review-top">
                          <span className="reviewer-name">{review.name || 'Customer'}</span>
                          <span className="review-rating">
                            <FaStar />
                            {Number(review.rating || 0).toFixed(1)}
                          </span>
                        </div>
                        {review.comment && <p>{review.comment}</p>}
                        {review.createdAt && (
                          <span className="review-date">{formatReviewDate(review.createdAt)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="review-empty">Be the first to share feedback on this service.</p>
                )}

                {user?.role === 'customer' ? (
                  <div className="review-form">
                    <div className="review-form-row">
                      <label>Rating</label>
                      <select
                        value={reviewForm.rating}
                        onChange={(event) => setReviewForm((prev) => ({
                          ...prev,
                          rating: event.target.value
                        }))}
                      >
                        <option value="5">5 - Excellent</option>
                        <option value="4">4 - Great</option>
                        <option value="3">3 - Good</option>
                        <option value="2">2 - Fair</option>
                        <option value="1">1 - Poor</option>
                      </select>
                    </div>
                    <div className="review-form-row">
                      <label>Comment</label>
                      <textarea
                        rows="3"
                        placeholder="Share your experience"
                        value={reviewForm.comment}
                        onChange={(event) => setReviewForm((prev) => ({
                          ...prev,
                          comment: event.target.value
                        }))}
                      />
                    </div>
                    <button
                      type="button"
                      className="review-submit"
                      onClick={handleReviewSubmit}
                      disabled={reviewSubmitting}
                    >
                      {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                ) : (
                  <p className="review-login-hint">Login as a customer to leave a review.</p>
                )}
              </div>

              <div className="service-modal-actions">
                {!isStaff && (
                  <>
                    <button
                      type="button"
                      className="btn-order"
                      onClick={() => {
                        handleOrderNow(selectedService);
                        closeModal();
                      }}
                    >
                      <FaShoppingCart />
                      <span>{isLoggedIn ? 'Order Now' : 'Register to Order'}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-custom"
                      onClick={() => {
                        handleRequestCustomizationForService(selectedService);
                        closeModal();
                      }}
                    >
                      <FaTools />
                      <span>Request Customization</span>
                    </button>
                    <button
                      className="btn-cart"
                      onClick={() => {
                        handleAddToCart(selectedService);
                        closeModal();
                      }}
                    >
                      <FaCartPlus />
                      <span>Add to Cart</span>
                    </button>
                  </>
                )}
                <button className="service-modal-close" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
