const items = document.querySelectorAll("#story-progress li");
const sections = [...items].map(item =>
  document.getElementById(item.dataset.target)
);

// Klick-Navigation
items.forEach(item => {
  item.addEventListener("click", () => {
    document
      .getElementById(item.dataset.target)
      .scrollIntoView({ behavior: "smooth" });
  });
});

// Scroll-Tracking
window.addEventListener("scroll", () => {
  const scrollPos = window.scrollY + window.innerHeight / 3;

  let activeIndex = 0;

  sections.forEach((section, i) => {
    if (section.offsetTop <= scrollPos) {
      activeIndex = i;
    }
  });

  items.forEach((item, i) => {
    item.classList.toggle("active", i === activeIndex);
  });

  const progress = (activeIndex / (sections.length - 1)) * 100;
  document.getElementById("progress-line-fill").style.height = progress + "%";
});