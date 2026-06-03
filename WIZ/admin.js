import { db, auth } from './firebase-init.js';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { signOut } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

/* =========================
   ADMIN LOGIN
========================= */
const ADMIN_EMAIL = "wiz@gmail.com";
const ADMIN_PASSWORD = "Itswiz@123pass";

const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');

loginForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    sessionStorage.setItem("admin_logged_in", "true");
    window.location.href = "admin-dashboard.html";
  } else {
    errorMsg.textContent = "Wrong credentials";
  }
});

/* =========================
   DASHBOARD PROTECTION
========================= */
if (window.location.pathname.includes('admin-dashboard.html')) {
  if (sessionStorage.getItem("admin_logged_in") !== "true") {
    window.location.href = "admin-login.html";
  }
}

/* =========================
   TOAST FUNCTION
========================= */
function showToast(msg, type = "success") {
  const existingToasts = document.querySelectorAll('.toast-message');
  existingToasts.forEach(toast => toast.remove());
  
  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  toast.innerHTML = msg;
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
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideInRight 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* =========================
   CHECK INTERNET CONNECTION
========================= */
function isOnline() {
  return navigator.onLine;
}

window.addEventListener('online', () => showToast('Internet connection restored', 'success'));
window.addEventListener('offline', () => showToast('No internet connection', 'error'));

/* =========================
   ESCAPE HTML
========================= */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* =========================
   UPLOAD PRODUCT (WITH IMAGE URL)
========================= */
document.getElementById('productForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!isOnline()) {
    showToast('No internet connection. Please check your network.', 'error');
    return;
  }
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Adding product...';
  
  try {
    const name = document.getElementById('prodName').value.trim();
    const price = parseFloat(document.getElementById('prodPrice').value);
    const description = document.getElementById('prodDesc').value.trim();
    const category = document.getElementById('prodCat').value.trim();
    const stock = parseInt(document.getElementById('prodStock').value);
    const discount = parseInt(document.getElementById('prodDiscount').value) || 0;
    const imageUrl = document.getElementById('prodImageUrl').value.trim();
    const displayLocation = document.getElementById('prodDisplayLocation').value;
    
    if (!name) {
      showToast('Product name is required', 'error');
      return;
    }
    if (isNaN(price) || price <= 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }
    if (isNaN(stock) || stock < 0) {
      showToast('Please enter a valid stock quantity', 'error');
      return;
    }
    if (!imageUrl) {
      showToast('Please enter an image URL', 'error');
      return;
    }
    
    let isFeatured = false;
    let isTrending = false;
    let isBestSeller = false;
    let isSpecialOffer = false;
    
    switch(displayLocation) {
      case 'featured':
        isFeatured = true;
        break;
      case 'trending':
        isTrending = true;
        break;
      case 'bestseller':
        isBestSeller = true;
        break;
      case 'special':
        isSpecialOffer = true;
        break;
    }
    
    await addDoc(collection(db, "products"), {
      name,
      price,
      description: description || '',
      category: category || 'Uncategorized',
      stock,
      discount,
      isFeatured,
      isTrending,
      isBestSeller,
      isSpecialOffer,
      images: [imageUrl],
      tags: [category || 'Uncategorized'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    showToast('✅ Product added successfully!', 'success');
    e.target.reset();
    document.getElementById('prodImageUrl').value = '';
    document.getElementById('prodDisplayLocation').value = 'none';
    
    await loadProductsList();
    await loadAnalytics();
    
  } catch (error) {
    console.error('Upload error:', error);
    if (error.code === 'permission-denied') {
      showToast('Permission denied. Check Firestore rules.', 'error');
    } else if (error.code === 'unauthenticated') {
      showToast('Session expired. Please login again.', 'error');
      setTimeout(() => {
        window.location.href = "admin-login.html";
      }, 2000);
    } else {
      showToast('Error: ' + error.message, 'error');
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
});

/* =========================
   LOAD PRODUCTS LIST (WITH IMAGES)
========================= */
async function loadProductsList() {
  try {
    if (!isOnline()) {
      const list = document.getElementById('productsList');
      if (list) {
        list.innerHTML = '<div style="padding:20px; text-align:center; color:#ef4444;">⚠️ No internet connection</div>';
      }
      return;
    }
    
    const snap = await getDocs(
      query(collection(db, "products"), orderBy("createdAt", "desc"))
    );
    
    const list = document.getElementById('productsList');
    if (!list) return;
    
    if (snap.empty) {
      list.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">📦 No products yet. Add your first product above!</div>';
      return;
    }
    
    list.innerHTML = snap.docs.map(d => {
      const p = d.data();
      
      let imageUrl = 'https://via.placeholder.com/50x50?text=No+Image';
      if (p.images && Array.isArray(p.images) && p.images.length > 0) {
        imageUrl = p.images[0];
      } else if (p.images && typeof p.images === 'string') {
        imageUrl = p.images;
      } else if (p.imageUrl) {
        imageUrl = p.imageUrl;
      }
      
      let badge = '';
      if (p.isSpecialOffer) {
        badge = '<span style="background:#ec489a; color:white; padding:2px 8px; border-radius:20px; font-size:11px; margin-left:8px;">💎 Special</span>';
      } else if (p.isFeatured) {
        badge = '<span style="background:#fbbf24; color:#000; padding:2px 8px; border-radius:20px; font-size:11px; margin-left:8px;">⭐ Featured</span>';
      } else if (p.isTrending) {
        badge = '<span style="background:#f97316; color:white; padding:2px 8px; border-radius:20px; font-size:11px; margin-left:8px;">🔥 Trending</span>';
      } else if (p.isBestSeller) {
        badge = '<span style="background:#eab308; color:#000; padding:2px 8px; border-radius:20px; font-size:11px; margin-left:8px;">🏆 Best Seller</span>';
      }
      
      const lowStock = p.stock <= 5 && p.stock > 0 ? '<span style="color:#f59e0b; font-size:11px; margin-left:8px;">⚠️ Low stock</span>' : '';
      const outOfStock = p.stock === 0 ? '<span style="color:#ef4444; font-size:11px; margin-left:8px;">❌ Out of stock</span>' : '';
      
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #e5e7eb;">
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="${imageUrl}" style="width:50px; height:50px; object-fit:cover; border-radius:8px;" onerror="this.src='https://via.placeholder.com/50x50?text=Error'">
            <div>
              <div style="display:flex; align-items:center; flex-wrap:wrap; gap:5px;">
                <strong>${escapeHtml(p.name)}</strong>
                <span style="color:#22c55e; font-weight:500;">₦${p.price}</span>
                ${badge}
                ${lowStock}
                ${outOfStock}
              </div>
              ${p.discount > 0 ? `<div style="font-size:12px; color:#22c55e; margin-top:4px;">🔥 ${p.discount}% OFF</div>` : ''}
              <div style="font-size:11px; color:#666; margin-top:2px;">Category: ${escapeHtml(p.category || 'Uncategorized')}</div>
            </div>
          </div>
          <button class="delete-btn" data-id="${d.id}" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:13px;">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      `;
    }).join('');
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('⚠️ Delete this product permanently? This cannot be undone.')) {
          try {
            await deleteDoc(doc(db, "products", btn.dataset.id));
            await loadProductsList();
            await loadAnalytics();
            showToast('🗑️ Product deleted', 'success');
          } catch (error) {
            showToast('Failed to delete product', 'error');
          }
        }
      });
    });
  } catch (error) {
    console.error('Load error:', error);
    const list = document.getElementById('productsList');
    if (list) {
      list.innerHTML = '<div style="padding:20px; text-align:center; color:#ef4444;">❌ Failed to load products. Please refresh the page.</div>';
    }
  }
}

/* =========================
   ANALYTICS & DASHBOARD STATS
========================= */
async function loadAnalytics() {
  try {
    if (!isOnline()) return;
    
    const snap = await getDocs(collection(db, "products"));
    const totalProducts = snap.size;
    
    const totalElem = document.getElementById('totalProducts');
    if (totalElem) totalElem.textContent = totalProducts;
    
    const totalOrdersElem = document.getElementById('totalOrders');
    const totalRevenueElem = document.getElementById('totalRevenue');
    const totalUsersElem = document.getElementById('totalUsers');
    
    if (totalOrdersElem) totalOrdersElem.textContent = '0';
    if (totalRevenueElem) totalRevenueElem.textContent = '₦0';
    if (totalUsersElem) totalUsersElem.textContent = '0';
    
    const catCount = {};
    let featuredCount = 0;
    let trendingCount = 0;
    let bestSellerCount = 0;
    let specialCount = 0;
    let outOfStockCount = 0;
    
    snap.forEach(d => {
      const p = d.data();
      const cat = p.category;
      if (cat && cat !== 'Uncategorized') {
        catCount[cat] = (catCount[cat] || 0) + 1;
      }
      if (p.isFeatured) featuredCount++;
      if (p.isTrending) trendingCount++;
      if (p.isBestSeller) bestSellerCount++;
      if (p.isSpecialOffer) specialCount++;
      if (p.stock === 0) outOfStockCount++;
    });
    
    const ctx = document.getElementById('salesChart')?.getContext('2d');
    if (ctx && typeof Chart !== "undefined") {
      if (window.salesChart) window.salesChart.destroy();
      window.salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: Object.keys(catCount).length ? Object.keys(catCount) : ['No Categories'],
          datasets: [{
            label: 'Products per category',
            data: Object.keys(catCount).length ? Object.values(catCount) : [0],
            backgroundColor: '#22c55e',
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' }
          },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          }
        }
      });
    }
    
    console.log('📊 Dashboard Stats:', {
      totalProducts,
      featured: featuredCount,
      trending: trendingCount,
      bestSeller: bestSellerCount,
      special: specialCount,
      outOfStock: outOfStockCount
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
  }
}

/* =========================
   LOGOUT
========================= */
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  try {
    await signOut(auth);
    sessionStorage.removeItem("admin_logged_in");
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
      window.location.href = "admin-login.html";
    }, 500);
  } catch (error) {
    console.error('Logout error:', error);
    sessionStorage.removeItem("admin_logged_in");
    window.location.href = "admin-login.html";
  }
});

/* =========================
   INITIALIZE DASHBOARD
========================= */
if (document.getElementById('productsList')) {
  loadProductsList();
  loadAnalytics();
  
  setInterval(() => {
    if (isOnline() && document.visibilityState === 'visible') {
      loadProductsList();
      loadAnalytics();
    }
  }, 30000);
}

/* =========================
   MOBILE MENU TOGGLE
========================= */
const mobileToggle = document.getElementById("mobileAdminToggle");
const mobileNav = document.getElementById("mobileAdminNav");

mobileToggle?.addEventListener("click", () => {
  mobileNav.classList.toggle("hidden");
});

document.getElementById("mobileLogoutBtn")?.addEventListener("click", () => {
  document.getElementById("logoutBtn")?.click();
});

/* =========================
   ADD CSS ANIMATION STYLES
========================= */
const style = document.createElement('style');
style.textContent = `
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
  
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
document.head.appendChild(style);