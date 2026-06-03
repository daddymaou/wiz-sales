import { db } from './firebase-init.js';
import { collection, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// Helper function to get image URL
function getImageUrl(product) {
  if (!product.images) return 'https://via.placeholder.com/400x300?text=No+Image';
  if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
  if (typeof product.images === 'string') return product.images;
  return 'https://via.placeholder.com/400x300?text=No+Image';
}

// Helper function to escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Helper function to render a product card (catalog style)
function renderProductCard(product, id) {
  const imgUrl = getImageUrl(product);
  const hasDiscount = product.discount && product.discount > 0;
  const discountedPrice = hasDiscount ? product.price - (product.price * product.discount / 100) : product.price;
  
  let badge = '';
  let badgeColor = '';
  if (product.isSpecialOffer) {
    badge = 'SPECIAL';
    badgeColor = '#ec489a';
  } else if (product.isFeatured) {
    badge = 'FEATURED';
    badgeColor = '#fbbf24';
  } else if (product.isTrending) {
    badge = 'TRENDING';
    badgeColor = '#f97316';
  } else if (product.isBestSeller) {
    badge = 'BEST SELLER';
    badgeColor = '#eab308';
  }
  
  return `
    <div class="product-card-catalog">
      <div class="product-card-image">
        <img src="${imgUrl}" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
        ${badge ? `<span class="product-badge" style="background: ${badgeColor};">${badge}</span>` : ''}
        ${hasDiscount ? `<span class="product-discount">-${product.discount}%</span>` : ''}
      </div>
      <div class="product-card-info">
        <h3 class="product-card-title">${escapeHtml(product.name)}</h3>
        <p class="product-card-desc">${escapeHtml((product.description || '').substring(0, 60))}${(product.description || '').length > 60 ? '...' : ''}</p>
        <div class="product-card-price-row">
          <div>
            ${hasDiscount 
              ? `<span class="product-card-price-sale">₦${discountedPrice.toFixed(2)}</span>
                 <span class="product-card-price-original">₦${product.price}</span>`
              : `<span class="product-card-price">₦${product.price}</span>`
            }
          </div>
          <span class="product-card-stock ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
            ${product.stock > 0 ? '✓ In stock' : '✗ Out of stock'}
          </span>
        </div>
        <a href="product-detail.html?id=${id}" class="product-card-btn">View Details →</a>
      </div>
    </div>
  `;
}

// Load categories
async function loadCategories() {
  try {
    const snap = await getDocs(collection(db, "products"));
    const cats = new Set();
    
    snap.forEach(d => { 
      const cat = d.data().category;
      if(cat && cat !== 'Uncategorized' && cat.trim() !== '') {
        cats.add(cat.trim());
      }
    });
    
    const container = document.getElementById('categoriesContainer');
    if(!container) return;
    
    if(cats.size === 0) {
      container.innerHTML = '<div class="text-center text-gray-500">No categories yet</div>';
      return;
    }
    
    container.innerHTML = Array.from(cats).map(c => 
      `<button class="category-chip">${escapeHtml(c)}</button>`
    ).join('');
    
    document.querySelectorAll('.category-chip').forEach(btn => 
      btn.addEventListener('click', () => window.location.href = `catalog.html?cat=${encodeURIComponent(btn.innerText)}`)
    );
  } catch(error) {
    console.error('Error loading categories:', error);
  }
}

// Load featured products - UPDATED with catalog style
async function loadFeatured() {
  try {
    const q = query(collection(db, "products"), where("isFeatured", "==", true), limit(10));
    const snap = await getDocs(q);
    const wrapper = document.getElementById('featuredSlider');
    if(!wrapper) return;
    
    if(snap.empty) {
      wrapper.innerHTML = '<div class="swiper-slide">No featured products</div>';
      return;
    }
    
    wrapper.innerHTML = snap.docs.map(doc => {
      const p = doc.data();
      return `
        <div class="swiper-slide">
          ${renderProductCard(p, doc.id)}
        </div>
      `;
    }).join('');
    
    if(typeof Swiper !== 'undefined') {
      new Swiper('.featuredSwiper', { 
        slidesPerView: 1,
        spaceBetween: 16,
        pagination: { el: '.swiper-pagination' },
        navigation: false,
        breakpoints: { 
          576: { slidesPerView: 2 },
          768: { slidesPerView: 3 }, 
          1024: { slidesPerView: 4 } 
        }
      });
    }
  } catch(error) {
    console.error('Error loading featured:', error);
  }
}

// Load trending, best sellers, and special offers - UPDATED with catalog style
async function loadTrendingAndMore() {
  try {
    // Trending
    const trendingSnap = await getDocs(query(collection(db, "products"), where("isTrending", "==", true), limit(4)));
    const trendingGrid = document.getElementById('trendingGrid');
    if(trendingGrid) {
      if(trendingSnap.empty) {
        trendingGrid.innerHTML = '<div class="text-center text-gray-500">No trending products</div>';
      } else {
        trendingGrid.innerHTML = trendingSnap.docs.map(d => renderProductCard(d.data(), d.id)).join('');
      }
    }
    
    // Best Sellers
    const bestSnap = await getDocs(query(collection(db, "products"), where("isBestSeller", "==", true), limit(4)));
    const bestGrid = document.getElementById('bestsellerGrid');
    if(bestGrid) {
      if(bestSnap.empty) {
        bestGrid.innerHTML = '<div class="text-center text-gray-500">No best sellers</div>';
      } else {
        bestGrid.innerHTML = bestSnap.docs.map(d => renderProductCard(d.data(), d.id)).join('');
      }
    }
    
    // Special Offers
    const discSnap = await getDocs(query(collection(db, "products"), where("discount", ">", 0), limit(6)));
    const discContainer = document.getElementById('discountProducts');
    if(discContainer) {
      if(discSnap.empty) {
        discContainer.innerHTML = '<div class="text-center text-gray-500">No special offers</div>';
      } else {
        discContainer.innerHTML = discSnap.docs.map(d => renderProductCard(d.data(), d.id)).join('');
      }
    }
  } catch(error) {
    console.error('Error loading sections:', error);
  }
}

// Testimonials
function loadTestimonials() {
  const testimonials = [
    { name: "Daniel Ololade", text: "Absolutely stunning platform, boosted my sales.", role: "Fashion Designer" },
    { name: "James A. Andrew.", text: "Best catalog UI I've ever used.", role: "Tech CEO" },
    { name: "Emeka Sophia.", text: "Fast, secure and conversion-focused.", role: "Shop Owner" }
  ];
  const container = document.getElementById('testimonialsContainer');
  if(container) {
    container.innerHTML = testimonials.map(t => `
      <div class="bg-white p-6 rounded-2xl shadow-sm">
        <div class="text-yellow-400">
          <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
        </div>
        <p class="mt-3 italic">“${t.text}”</p>
        <p class="font-semibold mt-4">${t.name}<span class="text-gray-400 text-sm"> / ${t.role}</span></p>
      </div>
    `).join('');
  }
}

// Live search
function initLiveSearch() {
  const input = document.getElementById('liveSearchInput');
  const resultsDiv = document.getElementById('liveSearchResults');
  if(!input) return;
  
  input.addEventListener('input', async (e) => {
    const term = e.target.value.toLowerCase();
    if(term.length < 2) { 
      resultsDiv.classList.add('hidden'); 
      return; 
    }
    
    try {
      const snap = await getDocs(collection(db, "products"));
      const filtered = snap.docs.filter(doc => 
        doc.data().name?.toLowerCase().includes(term)
      ).slice(0, 8);
      
      if(filtered.length) {
        resultsDiv.innerHTML = filtered.map(d => {
          const p = d.data();
          const imgUrl = getImageUrl(p);
          return `
            <div class="p-3 hover:bg-gray-100 cursor-pointer flex items-center gap-3" data-id="${d.id}">
              <img src="${imgUrl}" class="w-10 h-10 rounded object-cover">
              <div>
                <div class="font-medium">${escapeHtml(p.name)}</div>
                <div>₦${p.price}</div>
              </div>
            </div>
          `;
        }).join('');
        resultsDiv.classList.remove('hidden');
        
        document.querySelectorAll('#liveSearchResults > div').forEach(el => 
          el.addEventListener('click', () => { 
            window.location.href = `product-detail.html?id=${el.dataset.id}`; 
          })
        );
      } else {
        resultsDiv.classList.add('hidden');
      }
    } catch(error) {
      console.error('Search error:', error);
    }
  });
  
  document.addEventListener('click', (e) => { 
    if(resultsDiv && !resultsDiv.contains(e.target) && e.target !== input) {
      resultsDiv.classList.add('hidden');
    }
  });
}

// Initialize everything
if(document.getElementById('categoriesContainer')) {
  loadCategories();
  loadFeatured();
  loadTrendingAndMore();
  loadTestimonials();
  initLiveSearch();
}

// Add CSS styles for catalog-style product cards
const cardStyles = document.createElement('style');
cardStyles.textContent = `
  /* Catalog Style Product Cards */
  .product-card-catalog {
    background: white;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 8px 20px rgba(0,0,0,0.05);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .product-card-catalog:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(0,0,0,0.1);
  }
  
  .product-card-image {
    position: relative;
    height: 200px;
    overflow: hidden;
  }
  
  .product-card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  
  .product-card-catalog:hover .product-card-image img {
    transform: scale(1.05);
  }
  
  .product-badge {
    position: absolute;
    top: 12px;
    left: 12px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: white;
    text-transform: uppercase;
  }
  
  .product-discount {
    position: absolute;
    top: 12px;
    right: 12px;
    background: #dc2626;
    color: white;
    padding: 4px 8px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
  }
  
  .product-card-info {
    padding: 16px;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .product-card-title {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 6px;
    line-height: 1.4;
    color: #1f2937;
  }
  
  .product-card-desc {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 12px;
    line-height: 1.5;
  }
  
  .product-card-price-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  
  .product-card-price {
    font-size: 18px;
    font-weight: 700;
    color: var(--accent, #6b7d3a);
  }
  
  .product-card-price-sale {
    font-size: 18px;
    font-weight: 700;
    color: #dc2626;
  }
  
  .product-card-price-original {
    font-size: 13px;
    color: #9ca3af;
    text-decoration: line-through;
    margin-left: 6px;
  }
  
  .product-card-stock {
    font-size: 11px;
    font-weight: 500;
  }
  
  .product-card-stock.in-stock {
    color: #22c55e;
  }
  
  .product-card-stock.out-of-stock {
    color: #ef4444;
  }
  
  .product-card-btn {
    display: block;
    text-align: center;
    background: #1f2937;
    color: white;
    padding: 10px;
    border-radius: 30px;
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.2s ease;
    margin-top: auto;
  }
  
  .product-card-btn:hover {
    background: var(--accent, #6b7d3a);
  }
  
  /* Grid layouts */
  #trendingGrid, #bestsellerGrid, #discountProducts {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
  }
  
  /* Swiper slides */
  .swiper-slide {
    height: auto;
  }
  
  .featuredSwiper .product-card-catalog {
    margin: 5px;
  }
  
  /* ========== ANIMATIONS FOR MOBILE MENUS ========== */
  
  /* Hamburger Menu - Slide + Fade Animation */
  .mobile-menu {
    transition: opacity 0.3s ease, transform 0.3s ease;
    opacity: 0;
    transform: translateY(-10px);
  }
  
  .mobile-menu:not(.hidden) {
    opacity: 1;
    transform: translateY(0);
  }
  
  /* FAB Button - Rotate Animation */
  .mobile-fab {
    transition: transform 0.3s ease;
    cursor: pointer;
  }
  
  /* Action Panel - Scale + Fade Animation */
  .mobile-action-panel {
    transition: transform 0.3s ease, opacity 0.3s ease;
    transform: scale(0.9);
    opacity: 0;
    transform-origin: bottom right;
  }
  
  .mobile-action-panel.active {
    transform: scale(1);
    opacity: 1;
  }
  
  /* Overlay - Fade Animation */
  .mobile-overlay {
    transition: opacity 0.3s ease;
    opacity: 0;
    visibility: hidden;
  }
  
  .mobile-overlay.active {
    opacity: 1;
    visibility: visible;
  }
`;
document.head.appendChild(cardStyles);

// ========== SMOOTH ANIMATED MOBILE MENUS ==========

// Mobile menu toggle (Hamburger) - SLIDE + FADE animation
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");

if(mobileMenuBtn && mobileMenu) {
  // Set initial styles
  mobileMenu.style.transition = "opacity 0.3s ease, transform 0.3s ease";
  mobileMenu.style.opacity = "0";
  mobileMenu.style.transform = "translateY(-10px)";
  
  mobileMenuBtn.addEventListener("click", function() {
    const isHidden = mobileMenu.classList.contains("hidden");
    
    if (isHidden) {
      mobileMenu.classList.remove("hidden");
      // Trigger animation after removing hidden
      setTimeout(() => {
        mobileMenu.style.opacity = "1";
        mobileMenu.style.transform = "translateY(0)";
      }, 10);
    } else {
      mobileMenu.style.opacity = "0";
      mobileMenu.style.transform = "translateY(-10px)";
      setTimeout(() => {
        mobileMenu.classList.add("hidden");
      }, 300);
    }
  });
}

// Floating action button (Plus icon) - ROTATE animation
const actionBtn = document.getElementById("mobileActionBtn");
const actionPanel = document.getElementById("mobileActionPanel");
const overlay = document.getElementById("mobileOverlay");

if(actionBtn && actionPanel && overlay) {
  // Add rotate animation style
  actionBtn.style.transition = "transform 0.3s ease";
  
  actionBtn.addEventListener("click", function() {
    const isActive = actionPanel.classList.contains("active");
    
    if (!isActive) {
      // Open panel
      actionPanel.classList.add("active");
      overlay.classList.add("active");
      // Rotate plus icon to X (45 degrees)
      actionBtn.style.transform = "rotate(45deg)";
    } else {
      // Close panel
      actionPanel.classList.remove("active");
      overlay.classList.remove("active");
      // Rotate back to plus
      actionBtn.style.transform = "rotate(0deg)";
    }
  });
  
  overlay.addEventListener("click", function() {
    actionPanel.classList.remove("active");
    overlay.classList.remove("active");
    actionBtn.style.transform = "rotate(0deg)";
  });
}