import { db } from './firebase-init.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

async function loadProduct() {
  if (!productId) {
    document.body.innerHTML = '<div class="container" style="padding: 4rem; text-align: center;">❌ No product ID specified.</div>';
    return;
  }
  
  try {
    const docRef = doc(db, "products", productId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const p = docSnap.data();
      
      // Get image URL
      let imageUrl = 'https://via.placeholder.com/600x450?text=No+Image';
      if (p.images) {
        if (Array.isArray(p.images) && p.images.length > 0) {
          imageUrl = p.images[0];
        } else if (typeof p.images === 'string') {
          imageUrl = p.images;
        }
      }
      
      // Calculate discount
      const hasDiscount = p.discount && p.discount > 0;
      const discountedPrice = hasDiscount ? p.price - (p.price * p.discount / 100) : p.price;
      
      // Update page
      document.getElementById('productName').innerText = p.name;
      document.getElementById('productPrice').innerHTML = hasDiscount 
        ? `<span class="price"><span style="color: var(--accent);">₦${discountedPrice.toFixed(2)}</span> <span style="font-size: 1rem; color: var(--text-muted); text-decoration: line-through;">₦${p.price}</span></span>`
        : `<span class="price">₦${p.price}</span>`;
      document.getElementById('productDesc').innerText = p.description || 'No description provided.';
      document.getElementById('productStock').innerHTML = p.stock > 0 
        ? `<span style="color: var(--success);"><i class="fas fa-check-circle"></i> In Stock (${p.stock} available)</span>` 
        : '<span style="color: var(--danger);"><i class="fas fa-times-circle"></i> Out of stock</span>';
      
      // Set image
      const productImage = document.getElementById('productImage');
      if (productImage) {
        productImage.src = imageUrl;
        productImage.alt = p.name;
        productImage.onerror = () => {
          productImage.src = 'https://via.placeholder.com/600x450?text=Image+Not+Found';
        };
      }
      
      // Update page title
      document.title = `${p.name} – WIZ SALES`;
      
      // WhatsApp share
      const whatsappMsg = `Hello%2C%20I%20want%20to%20buy%20${encodeURIComponent(p.name)}%20for%20₦${hasDiscount ? discountedPrice : p.price}.%20Product%3A%20${window.location.href}`;
      const whatsappBtn = document.getElementById('whatsappBuyBtn');
      if (whatsappBtn) {
        whatsappBtn.href = `https://wa.me/2348000000000?text=${whatsappMsg}`;
      }
      
      // Share button
      const shareBtn = document.getElementById('shareBtn');
      if (shareBtn) {
        shareBtn.addEventListener('click', () => {
          if (navigator.share) {
            navigator.share({ title: p.name, url: window.location.href });
          } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
          }
        });
      }
      // ========== MOBILE MENU FOR PRODUCT DETAIL PAGE ==========
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
      // QR Code
      if (typeof QRCode !== 'undefined') {
        const qrDiv = document.getElementById('qrcode');
        if (qrDiv) {
          qrDiv.innerHTML = '';
          new QRCode(qrDiv, { 
            text: window.location.href, 
            width: 128, 
            height: 128 
          });
        }
      }
      
    } else {
      document.body.innerHTML = '<div class="container" style="padding: 4rem; text-align: center;">❌ Product not found.</div>';
    }
  } catch (error) {
    console.error('Error loading product:', error);
    document.body.innerHTML = '<div class="container" style="padding: 4rem; text-align: center; color: var(--danger);">❌ Failed to load product. Please try again.</div>';
  }
}

loadProduct();
// ========== MOBILE MENU FOR PRODUCT DETAIL PAGE ==========
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