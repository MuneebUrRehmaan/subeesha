const products=[
 {name:"Premium Leather Handbag",cat:"Bags",price:3999,old:4999,stock:24,sku:"BAG-001",emoji:"👜"},
 {name:"Premium Casual Sneakers",cat:"Fashion",price:5999,old:6999,stock:18,sku:"SHO-002",emoji:"👟"},
 {name:"Classic Premium Watch",cat:"Watches",price:6499,old:7499,stock:7,sku:"WAT-003",emoji:"⌚"},
 {name:"Modern Casual Outfit",cat:"Fashion",price:3499,old:0,stock:42,sku:"FAS-004",emoji:"👕"},
 {name:"Everyday Shoulder Bag",cat:"Bags",price:2999,old:0,stock:31,sku:"BAG-005",emoji:"👜"},
 {name:"Classic Lifestyle Shoes",cat:"Fashion",price:4499,old:0,stock:4,sku:"SHO-006",emoji:"👞"},
 {name:"Glow Beauty Kit",cat:"Beauty",price:2499,old:2999,stock:16,sku:"BEA-007",emoji:"💄"},
 {name:"Kids Comfort Set",cat:"Kids",price:1999,old:0,stock:55,sku:"KID-008",emoji:"🧸"}
];
const orders=[
 ["#SUB-1048","Ayesha K.","09 Aug 2026",3,"Rs. 12,497","Paid","Processing"],
 ["#SUB-1047","Hamza R.","09 Aug 2026",2,"Rs. 8,498","Paid","Pending"],
 ["#SUB-1046","Sana M.","08 Aug 2026",4,"Rs. 17,896","COD","Delivered"],
 ["#SUB-1045","Ali Hassan","08 Aug 2026",1,"Rs. 6,499","Paid","Shipped"],
 ["#SUB-1044","Mariam S.","07 Aug 2026",2,"Rs. 5,498","Paid","Delivered"],
 ["#SUB-1043","Ahmed B.","07 Aug 2026",1,"Rs. 3,999","COD","Cancelled"]
];
const customers=[
 ["Ayesha K.","ayesha@example.com",12,"Rs. 48,820","Rs. 620","Active"],
 ["Hamza R.","hamza@example.com",8,"Rs. 31,450","Rs. 245","Active"],
 ["Sana M.","sana@example.com",19,"Rs. 84,900","Rs. 1,140","Active"],
 ["Ali Hassan","ali@example.com",4,"Rs. 15,996","Rs. 80","Active"],
 ["Mariam S.","mariam@example.com",7,"Rs. 27,390","Rs. 410","Active"]
];

function showPage(id){
 document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
 document.getElementById(id).classList.add("active");
 document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n.dataset.page===id));
 const n=document.querySelector('.nav[data-page="'+id+'"]');
 document.getElementById("title").textContent=n?n.innerText.trim():id;
 document.getElementById("subtitle").textContent="Manage your Subeesha store from this section.";
 if(innerWidth<801) document.getElementById("sidebar").classList.remove("open");
 if(id==="products")renderProducts();
}
document.querySelectorAll(".nav").forEach(n=>n.onclick=()=>showPage(n.dataset.page));
function toggleSidebar(){const s=document.getElementById("sidebar");if(window.innerWidth<=800)s.classList.toggle("open");else s.classList.toggle("collapsed")}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function renderProducts(){
 const q=(document.getElementById("productSearch")?.value||"").toLowerCase();
 const c=document.getElementById("productCat")?.value||"";
 const list=products.filter(p=>(p.name.toLowerCase().includes(q)||p.sku.toLowerCase().includes(q))&&(!c||p.cat===c));
 document.getElementById("productGrid").innerHTML=list.map((p,i)=>`<div class="card prod"><div class="prod-img">${p.emoji}</div><div class="prod-body"><span class="label">${p.cat}</span><h3>${p.name}</h3><span class="price">Rs. ${p.price.toLocaleString()}</span>${p.old?`<span class="old">Rs. ${p.old.toLocaleString()}</span>`:""}<div class="prod-footer"><span class="status ${p.stock<8?"pending":"success"}">${p.stock} in stock</span><button class="btn secondary" onclick="editProduct('${p.sku}')">Edit</button></div></div></div>`).join("");
}
function editProduct(sku){const p=products.find(x=>x.sku===sku);openProduct(p)}
function openProduct(p=null){
 document.getElementById("modalTitle").textContent=p?"Edit Product":"Add Product";
 document.getElementById("modalBody").innerHTML=`<div class="form-grid"><div class="field"><label>Product Name</label><input id="mname" value="${p?.name||""}"></div><div class="field"><label>SKU</label><input id="msku" value="${p?.sku||""}"></div><div class="field"><label>Category</label><select id="mcat"><option>Fashion</option><option>Bags</option><option>Watches</option><option>Beauty</option><option>Kids</option></select></div><div class="field"><label>Price (PKR)</label><input id="mprice" type="number" value="${p?.price||""}"></div><div class="field"><label>Compare-at Price</label><input id="mold" type="number" value="${p?.old||""}"></div><div class="field"><label>Stock Quantity</label><input id="mstock" type="number" value="${p?.stock||0}"></div><div class="field full"><label>Description</label><textarea placeholder="Product description..."></textarea></div><div class="field full"><label>Product Image</label><input type="file" accept="image/*"></div></div>`;
 if(p)document.getElementById("mcat").value=p.cat;
 document.getElementById("modal").classList.add("show");
}
function openSimple(title,label){document.getElementById("modalTitle").textContent=title;document.getElementById("modalBody").innerHTML=`<div class="field"><label>${label}</label><input id="simpleInput" placeholder="${label}"></div>`;document.getElementById("modal").classList.add("show")}
function closeModal(){document.getElementById("modal").classList.remove("show")}
function saveModal(){closeModal();toast("Changes saved successfully")}
function renderOrders(){
 document.querySelector("#ordersTable tbody").innerHTML=orders.map(o=>`<tr><td><b>${o[0]}</b></td><td>${o[1]}</td><td>${o[2]}</td><td>${o[3]}</td><td><b>${o[4]}</b></td><td>${o[5]}</td><td><span class="status ${o[6]==="Delivered"?"success":o[6]==="Cancelled"?"cancel":o[6]==="Pending"?"pending":"processing"}">${o[6]}</span></td><td><button class="btn secondary" onclick="toast('Order ${o[0]} opened')">View</button></td></tr>`).join("");
 document.querySelector("#recentOrders").innerHTML=orders.slice(0,4).map(o=>`<tr><td><b>${o[0]}</b></td><td>${o[1]}</td><td>${o[4]}</td><td><span class="status ${o[6]==="Delivered"?"success":o[6]==="Pending"?"pending":"processing"}">${o[6]}</span></td></tr>`).join("");
}
function renderCustomers(){document.querySelector("#customersTable").innerHTML=customers.map(c=>`<tr><td><b>${c[0]}</b></td><td>${c[1]}</td><td>${c[2]}</td><td>${c[3]}</td><td>${c[4]}</td><td><span class="status success">${c[5]}</span></td><td><button class="btn secondary" onclick="toast('Customer profile opened')">View</button></td></tr>`).join("")}
function renderInventory(){document.querySelector("#inventoryTable").innerHTML=products.map(p=>`<tr><td><div class="product-cell"><div class="thumb">${p.emoji}</div><b>${p.name}</b></div></td><td>${p.sku}</td><td><input value="${p.stock}" style="width:65px;border:1px solid #ddd;padding:7px;border-radius:5px"></td><td>8</td><td><span class="status ${p.stock<8?"pending":"success"}">${p.stock<8?"Low Stock":"In Stock"}</span></td><td><button class="btn secondary" onclick="toast('Stock updated')">Update</button></td></tr>`).join("")}
function renderCategories(){const cats=[["Fashion","96","👗"],["Bags","48","👜"],["Watches","32","⌚"],["Beauty","74","💄"],["Kids","61","🧸"],["Accessories","117","💍"]];document.getElementById("categoryGrid").innerHTML=cats.map(c=>`<div class="card mini-card"><div style="font-size:30px">${c[2]}</div><h3>${c[0]}</h3><p>${c[1]} products · Active</p><button class="btn secondary" onclick="toast('${c[0]} category edited')">Edit Category</button></div>`).join("")}
function filterTable(input,id){const q=input.value.toLowerCase();document.querySelectorAll("#"+id+" tbody tr").forEach(r=>r.style.display=r.innerText.toLowerCase().includes(q)?"":"none")}
function globalSearch(q){if(q.length>2)toast("Searching store for: "+q)}
renderProducts();renderOrders();renderCustomers();renderInventory();renderCategories();
