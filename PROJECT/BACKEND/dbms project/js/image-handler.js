// Image loading and fallback handler
function setupImageHandling() {
    const DEFAULT_IMAGE = 'images/default-food.svg';
    const IMAGE_MAP = {
        'breakfast': 'images/idli.jpg',
        'lunch': 'images/chicken gravy.webp',
        'dinner': 'images/fish gravy.webp',
        'beverages': 'images/default-beverage.svg'
    };

    function getFallbackImage(imgElement) {
        // Try to determine category from parent elements
        const menuItem = imgElement.closest('.menu_item');
        const category = menuItem?.closest('[id^="section-"]')?.id.replace('section-', '');
        return IMAGE_MAP[category] || DEFAULT_IMAGE;
    }

    function handleImageError(img) {
        const fallback = getFallbackImage(img);
        if (img.src !== fallback) {
            img.src = fallback;
        }
    }

    // Set error handler for existing images
    document.querySelectorAll('img').forEach(img => {
        img.onerror = () => handleImageError(img);
    });

    // Handle dynamically added images
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.tagName === 'IMG') {
                    node.onerror = () => handleImageError(node);
                }
                if (node.nodeType === 1 && node.querySelectorAll) {
                    node.querySelectorAll('img').forEach(img => {
                        img.onerror = () => handleImageError(img);
                    });
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}