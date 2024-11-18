new Vue({
  el: '#app',
  data: {
    lessons: [],
    sortBy: 'subject',
    sortOrder: 'asc',
    searchQuery: '',
    cart: [],
    showCart: false,
    name: '',
    phone: '',
    nameError: '',
    phoneError: '',
    confirmationMessage: '',
    showModal: false // Controls visibility of the modal
  },
  computed: {
    sortedLessons() {
      let filteredLessons = this.lessons.filter((lesson) => {
        return (
          (lesson.subject && lesson.subject.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
          (lesson.location && lesson.location.toLowerCase().includes(this.searchQuery.toLowerCase()))
        );
      });
    
      return filteredLessons.sort((a, b) => {
        let modifier = this.sortOrder === 'asc' ? 1 : -1;
    
        if (this.sortBy === 'price' || this.sortBy === 'spaces') {
          return (a[this.sortBy] - b[this.sortBy]) * modifier;
        } else {
          // Handle undefined properties gracefully
          let aValue = a[this.sortBy] || ''; // Fallback to empty string
          let bValue = b[this.sortBy] || ''; // Fallback to empty string
          return aValue.localeCompare(bValue) * modifier;
        }
      });
    },
    isFormValid() {
      return this.name && !this.nameError && this.phone && !this.phoneError;
    }
  },
  methods: {
    addToCart(lesson) {
      if (lesson.spaces > 0) {
        lesson.spaces--;
        this.cart.push(lesson);
      }
    },
    fetchProducts: async function () {
      try {
          const response = await fetch('http://localhost:3000/collections/Lessons');
          this.lessons = await response.json();
      } catch (error) {
          console.error('Error fetching products:', error);
      }
    },
    toggleCart() {
      this.showCart = !this.showCart;
    },
    removeFromCart(item, index) {
      item.spaces++;
      this.cart.splice(index, 1);
      if (this.cart.length === 0) {
        this.showCart = false;
      }
    },
    validateName() {
      const regex = /^[A-Za-z]+$/;
      this.nameError = regex.test(this.name) ? '' : 'Name must contain only letters';
    },
    validatePhone() {
      const regex = /^[0-9]+$/;
      this.phoneError = regex.test(this.phone) ? '' : 'Phone must contain only numbers';
    },
    checkout() {
      // Open modal to ask for name and phone
      this.showModal = true;
    },
    // Handle the "Back" button click
    closeModal() {
      this.showModal = false;
    },
    // Handle the "Send" button click (submit the order)
    sendOrder() {
      if (this.isFormValid) {
        this.confirmationMessage = `Order for ${this.name} has been submitted!`;
        this.cart = [];
        this.name = '';
        this.phone = '';
        this.showModal = false; // Close the modal after submitting the order
        this.showCart = false;
      } else {
        this.nameError = this.name ? '' : 'Name is required';
        this.phoneError = this.phone ? '' : 'Phone number is required';
      }
    }
  },
  mounted: function() {
    this.fetchProducts();
  }
});