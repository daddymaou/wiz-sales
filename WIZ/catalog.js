import { db } from './firebase-init.js';
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

let allProducts = [];
let currentFilter = 'all';
let currentSort = 'latest';

function showToast(msg, type = "info") {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    z-index: 9999;
    font-size: 14px;
  `;
  toast.innerHTML = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Helper function to render a product card (catalog style - same as homepage)
function renderProductCard(product, id) {
  let imageUrl = 'https://via.placeholder.com/400x300?text=No+Image';
  if (product.images) {
    if (Array.isArray(product.images) && product.images.length > 0) {
      imageUrl = product.images[0];
    } else if (typeof product.images === 'string') {
      imageUrl = product.images;
    }
  }
  
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
        <img src="${imageUrl}" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
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

async function loadProducts() {
  const container = document.getElementById('productsGrid');
  if (!container) return;
  
  container.innerHTML = '<div class="col-span-full text-center py-10">Loading products...</div>';
  
  try {
    let q = collection(db, "products");
    
    if (currentFilter !== 'all') {
      q = query(q, where("category", "==", currentFilter));
    }
    
    if (currentSort === 'price-asc') {
      q = query(q, orderBy("price", "asc"));
    } else if (currentSort === 'price-desc') {
      q = query(q, orderBy("price", "desc"));
    } else if (currentSort === 'latest') {
      q = query(q, orderBy("createdAt", "desc"));
    }
    
    const snap = await getDocs(q);
    allProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderProducts(allProducts);
    
  } catch (error) {
    console.error('Load error:', error);
    container.innerHTML = '<div class="col-span-full text-center py-10 text-red-500">❌ Failed to load products. Please refresh the page.</div>';
  }
}

function renderProducts(products) {
  const container = document.getElementById('productsGrid');
  if (!container) return;
  
  if (products.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-10">📦 No products found.</div>';
    return;
  }
  
  container.innerHTML = products.map(p => renderProductCard(p, p.id)).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function filterByCategory(cat) { 
  currentFilter = cat; 
  loadProducts(); 
}

function sortProducts(sortType) { 
  currentSort = sortType; 
  loadProducts(); 
}

function searchProducts(term) { 
  const filtered = allProducts.filter(p => 
    p.name.toLowerCase().includes(term) || 
    (p.category && p.category.toLowerCase().includes(term))
  ); 
  renderProducts(filtered); 
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
    color: #6b7d3a;
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
    background: #6b7d3a;
  }
  
  /* Products Grid */
  #productsGrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
  }
  
  /* Mobile Menu Styles */
  .mobile-menu {
    position: absolute;
    top: 70px;
    left: 0;
    right: 0;
    background: white;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 1000;
    border-radius: 0 0 20px 20px;
  }
  
  .mobile-menu.hidden {
    display: none;
  }
  
  .mobile-menu a {
    padding: 12px;
    text-decoration: none;
    color: #333;
    font-weight: 500;
    border-radius: 10px;
  }
  
  .mobile-fab {
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #6b7d3a;
    color: white;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.3s ease;
  }
  
  .mobile-action-panel {
    position: fixed;
    bottom: 140px;
    right: 20px;
    background: white;
    border-radius: 16px;
    padding: 0.5rem;
    display: none;
    flex-direction: column;
    gap: 0.5rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1001;
    min-width: 150px;
  }
  
  .mobile-action-panel.active {
    display: flex;
  }
  
  .mobile-action-panel a {
    padding: 12px 16px;
    text-decoration: none;
    color: #333;
    display: flex;
    align-items: center;
    gap: 12px;
    border-radius: 12px;
  }
  
  .mobile-action-panel a:hover {
    background: #f3f4f6;
  }
  
  .mobile-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: none;
    z-index: 999;
  }
  
  .mobile-overlay.active {
    display: block;
  }
`;
document.head.appendChild(cardStyles);

// Initialize catalog
if (document.getElementById('productsGrid')) {
  loadProducts();
  
  document.getElementById('categoryFilter')?.addEventListener('change', (e) => filterByCategory(e.target.value));
  document.getElementById('sortBy')?.addEventListener('change', (e) => sortProducts(e.target.value));
  document.getElementById('searchInput')?.addEventListener('input', (e) => searchProducts(e.target.value.toLowerCase()));
  
  // Load categories
  getDocs(collection(db, "products")).then(snap => {
    const cats = new Set();
    snap.forEach(doc => { 
      if (doc.data().category) cats.add(doc.data().category); 
    });
    const catSelect = document.getElementById('categoryFilter');
    if (catSelect && cats.size > 0) {
      catSelect.innerHTML = '<option value="all">All Categories</option>' + 
        Array.from(cats).map(c => `<option value="${c}">${c}</option>`).join('');
    }
  }).catch(console.error);
}

// ========== MOBILE MENU TOGGLE FOR CATALOG PAGE ==========
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");

if (mobileMenuBtn && mobileMenu) {
  mobileMenuBtn.addEventListener("click", function(e) {
    e.stopPropagation();
    mobileMenu.classList.toggle("hidden");
  });
  
  // Close menu when clicking outside
  document.addEventListener("click", function(event) {
    if (mobileMenu && !mobileMenu.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
      mobileMenu.classList.add("hidden");
    }
  });
}

// Floating action button menu
const actionBtn = document.getElementById("mobileActionBtn");
const actionPanel = document.getElementById("mobileActionPanel");
const overlay = document.getElementById("mobileOverlay");

if (actionBtn && actionPanel && overlay) {
  actionBtn.addEventListener("click", function(e) {
    e.stopPropagation();
    actionPanel.classList.toggle("active");
    overlay.classList.toggle("active");
  });
  
  overlay.addEventListener("click", function() {
    actionPanel.classList.remove("active");
    overlay.classList.remove("active");
  });
}
// ========== MOBILE MENU FOR CATALOG PAGE ==========
(function() {
    const initMobileMenu = () => {
      const menuBtn = document.getElementById('mobileMenuBtn');
      const mobileMenu = document.getElementById('mobileMenu');
      const actionBtn = document.getElementById('mobileActionBtn');
      const actionPanel = document.getElementById('mobileActionPanel');
      const overlay = document.getElementById('mobileOverlay');
      
      if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          mobileMenu.classList.toggle('hidden');
        });
        
        document.addEventListener('click', (e) => {
          if (mobileMenu && !mobileMenu.contains(e.target) && menuBtn && !menuBtn.contains(e.target)) {
            mobileMenu.classList.add('hidden');
          }
        });
      }
      
      if (actionBtn && actionPanel && overlay) {
        actionBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          actionPanel.classList.toggle('active');
          overlay.classList.toggle('active');
        });
        
        overlay.addEventListener('click', () => {
          actionPanel.classList.remove('active');
          overlay.classList.remove('active');
        });
      }
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initMobileMenu);
    } else {
      initMobileMenu();
    }
  })();