// PDF Reader App with Mobile Support and Page Turn Animations
class PDFReaderApp {
    constructor() {
        this.pdfDoc = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.0;
        this.canvas = null;
        this.ctx = null;
        this.isLoading = false;
        this.renderTask = null;
        
        // Mobile touch handling
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.swipeThreshold = 50;
        this.isAnimating = false;
        this.isReadingMode = false;
        this.controlsVisible = false;
        this.hideControlsTimer = null;
        this.mobileZoomLevel = 1.5; // Start with 150% zoom for better text readability
        this.maxZoom = 4.0;
        this.minZoom = 0.8;
        this.lastPinchDistance = 0;
        this.isPinching = false;
        this.devicePixelRatio = window.devicePixelRatio || 1;
        
        this.init();
    }
    
    init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupTouchHandling();
        this.setupKeyboardNavigation();
        
        // Show initial status
        this.updateStatus('Ready to load PDF');
        
        // Setup PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    }
    
    setupElements() {
        this.elements = {
            fileInput: document.getElementById('fileInput'),
            fileInputTrigger: document.getElementById('fileInput-trigger'),
            canvas: document.getElementById('pdfCanvas'),
            welcomeScreen: document.getElementById('welcomeScreen'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            documentTitle: document.getElementById('documentTitle'),
            currentPageInput: document.getElementById('currentPageInput'),
            totalPagesSpan: document.getElementById('totalPages'),
            prevPageBtn: document.getElementById('prevPage'),
            nextPageBtn: document.getElementById('nextPage'),
            zoomInBtn: document.getElementById('zoomIn'),
            zoomOutBtn: document.getElementById('zoomOut'),
            mobilePageTurn: document.getElementById('mobilePageTurn'),
            mobilePrevBtn: document.getElementById('mobilePrevBtn'),
            mobileNextBtn: document.getElementById('mobileNextBtn'),
            mobilePageInfo: document.getElementById('mobilePageInfo'),
            zoomLevel: document.getElementById('zoomLevel'),
            fitWidthBtn: document.getElementById('fitWidth'),
            fitPageBtn: document.getElementById('fitPage'),
            statusText: document.getElementById('statusText'),
            downloadBtn: document.getElementById('downloadBtn'),
            printBtn: document.getElementById('printBtn'),
            fullscreenBtn: document.getElementById('fullscreenBtn'),
            sidebar: document.getElementById('sidebar'),
            sidebarToggle: document.getElementById('sidebarToggle'),
            tocList: document.getElementById('tocList'),
            viewerContainer: document.getElementById('viewerContainer')
        };
        
        this.canvas = this.elements.canvas;
        this.ctx = this.canvas.getContext('2d');
        
        // Optimize canvas context for crisp rendering
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.ctx.textRenderingOptimization = 'optimizeQuality';
    }
    
    setupEventListeners() {
        // File input
        this.elements.fileInputTrigger.addEventListener('click', () => {
            this.elements.fileInput.click();
        });
        
        this.elements.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type === 'application/pdf') {
                this.loadPDF(file);
            } else {
                this.showError('Please select a valid PDF file');
            }
        });
        
        // Navigation
        this.elements.prevPageBtn.addEventListener('click', () => this.previousPage());
        this.elements.nextPageBtn.addEventListener('click', () => this.nextPage());
        this.elements.currentPageInput.addEventListener('change', (e) => {
            const page = parseInt(e.target.value);
            if (page >= 1 && page <= this.totalPages) {
                this.goToPage(page);
            } else {
                e.target.value = this.currentPage;
            }
        });
        
        // Mobile page turn buttons
        if (this.elements.mobilePrevBtn && this.elements.mobileNextBtn) {
            this.elements.mobilePrevBtn.addEventListener('click', () => this.previousPage());
            this.elements.mobileNextBtn.addEventListener('click', () => this.nextPage());
        }
        
        // Mobile zoom controls
        const mobileZoomIn = document.getElementById('mobileZoomIn');
        const mobileZoomOut = document.getElementById('mobileZoomOut');
        
        if (mobileZoomIn) {
            mobileZoomIn.addEventListener('click', () => this.mobileZoomIn());
        }
        
        if (mobileZoomOut) {
            mobileZoomOut.addEventListener('click', () => this.mobileZoomOut());
        }
        
        // Mobile menu button
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Tap zones for reading mode
        this.setupTapZones();
        
        // Zoom controls
        this.elements.zoomInBtn.addEventListener('click', () => this.zoomIn());
        this.elements.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        this.elements.fitWidthBtn.addEventListener('click', () => this.fitToWidth());
        this.elements.fitPageBtn.addEventListener('click', () => this.fitToPage());
        
        // Footer controls
        this.elements.downloadBtn.addEventListener('click', () => this.downloadPDF());
        this.elements.printBtn.addEventListener('click', () => this.printPDF());
        this.elements.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        
        // Sidebar toggle
        this.elements.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Listen for display changes (external monitor connections, etc.)
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(resolution: 1dppx)');
            if (mediaQuery.addListener) {
                mediaQuery.addListener(() => this.handleDisplayChange());
            }
        }
        
        // Prevent drag and drop of files on the document
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'application/pdf') {
                this.loadPDF(files[0]);
            }
        });
    }
    
    setupTouchHandling() {
        let hammertime = null;
        
        // Simple touch handling for swipe gestures
        this.elements.viewerContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });
        
        this.elements.viewerContainer.addEventListener('touchmove', (e) => {
            // Prevent default scrolling when swiping horizontally
            if (e.touches.length === 1) {
                const touchX = e.touches[0].clientX;
                const touchY = e.touches[0].clientY;
                const deltaX = Math.abs(touchX - this.touchStartX);
                const deltaY = Math.abs(touchY - this.touchStartY);
                
                if (deltaX > deltaY) {
                    e.preventDefault();
                }
            }
        }, { passive: false });
        
        this.elements.viewerContainer.addEventListener('touchend', (e) => {
            if (!this.pdfDoc || this.isAnimating) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = touchEndX - this.touchStartX;
            const deltaY = touchEndY - this.touchStartY;
            
            // Check if it's a horizontal swipe
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.swipeThreshold) {
                if (deltaX > 0) {
                    // Swipe right - previous page
                    this.previousPage();
                } else {
                    // Swipe left - next page
                    this.nextPage();
                }
            }
        }, { passive: true });
        
        // Enhanced pinch to zoom for mobile reading
        this.elements.viewerContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                this.isPinching = true;
                this.lastPinchDistance = this.getPinchDistance(e.touches);
                this.lastScale = this.isReadingMode ? this.mobileZoomLevel : this.scale;
                
                // Show controls briefly during zoom
                if (this.isReadingMode) {
                    this.showControls();
                }
            }
        }, { passive: true });
        
        this.elements.viewerContainer.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && this.isPinching) {
                e.preventDefault();
                const currentDistance = this.getPinchDistance(e.touches);
                const scaleChange = currentDistance / this.lastPinchDistance;
                
                if (this.isReadingMode) {
                    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.lastScale * scaleChange));
                    this.mobileZoomLevel = newZoom;
                    this.renderPageWithMobileZoom();
                } else {
                    const newScale = this.lastScale * scaleChange;
                    if (newScale >= 0.5 && newScale <= 3.0) {
                        this.setZoom(newScale);
                    }
                }
            }
        }, { passive: false });
        
        this.elements.viewerContainer.addEventListener('touchend', (e) => {
            if (this.isPinching) {
                this.isPinching = false;
                // Reset auto-hide timer after zoom
                if (this.isReadingMode && this.controlsVisible) {
                    this.resetHideTimer();
                }
            }
        }, { passive: true });
    }
    
    getPinchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (!this.pdfDoc) return;
            
            switch(e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    this.previousPage();
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                case ' ':
                    e.preventDefault();
                    this.nextPage();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goToPage(1);
                    break;
                case 'End':
                    e.preventDefault();
                    this.goToPage(this.totalPages);
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    this.zoomIn();
                    break;
                case '-':
                    e.preventDefault();
                    this.zoomOut();
                    break;
            }
        });
    }
    
    async loadPDF(file) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading(true);
        this.updateStatus('Loading PDF...');
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            
            this.pdfDoc = await loadingTask.promise;
            this.totalPages = this.pdfDoc.numPages;
            this.currentPage = 1;
            
            // Update UI
            this.elements.documentTitle.textContent = file.name;
            this.elements.totalPagesSpan.textContent = this.totalPages;
            this.elements.currentPageInput.max = this.totalPages;
            this.elements.currentPageInput.value = 1;
            
            // Enable controls
            this.enableControls();
            
            // Hide welcome screen and show canvas
            this.elements.welcomeScreen.style.display = 'none';
            this.elements.canvas.style.display = 'block';
            
            // Show mobile page turn button on mobile devices and enter reading mode
            if (window.innerWidth <= 768 && this.elements.mobilePageTurn) {
                this.elements.mobilePageTurn.style.display = 'flex';
                // Auto-enter reading mode on mobile
                setTimeout(() => this.enterReadingMode(), 1000);
            }
            
            // Load table of contents
            this.loadTableOfContents();
            
            // Render first page
            await this.renderPage();
            
            this.updateStatus(`Loaded: ${file.name} (${this.totalPages} pages)`);
            
        } catch (error) {
            console.error('Error loading PDF:', error);
            this.showError('Failed to load PDF file');
            this.updateStatus('Error loading PDF');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }
    
    async renderPage() {
        if (!this.pdfDoc || this.isLoading) return;
        
        try {
            const page = await this.pdfDoc.getPage(this.currentPage);
            
            // Calculate scale to fit container
            if (this.scale === 'fit-width' || this.scale === 'fit-page') {
                this.calculateFitScale(page);
            }
            
            const viewport = page.getViewport({ scale: this.scale });
            
            // Set canvas dimensions with device pixel ratio for crisp rendering
            const outputScale = this.devicePixelRatio;
            this.canvas.width = Math.floor(viewport.width * outputScale);
            this.canvas.height = Math.floor(viewport.height * outputScale);
            this.canvas.style.width = Math.floor(viewport.width) + 'px';
            this.canvas.style.height = Math.floor(viewport.height) + 'px';
            
            // Scale the drawing context for high-DPI displays
            const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
            
            // Create canvas container if not exists
            if (!this.canvas.parentElement.classList.contains('pdf-canvas-container')) {
                const container = document.createElement('div');
                container.className = 'pdf-canvas-container';
                this.canvas.parentNode.insertBefore(container, this.canvas);
                container.appendChild(this.canvas);
            }
            
            // Cancel any existing render task
            if (this.renderTask) {
                this.renderTask.cancel();
            }
            
            // Render page with high-DPI support
            this.renderTask = page.render({
                canvasContext: this.ctx,
                viewport: viewport,
                transform: transform
            });
            
            await this.renderTask.promise;
            
            // Update UI
            this.updateNavigation();
            this.updateZoomLevel();
            
        } catch (error) {
            if (error.name !== 'RenderingCancelledException') {
                console.error('Error rendering page:', error);
                this.showError('Failed to render page');
            }
        }
    }
    
    calculateFitScale(page) {
        const viewport = page.getViewport({ scale: 1.0 });
        const container = this.elements.viewerContainer;
        const containerWidth = container.clientWidth - 40; // padding
        const containerHeight = container.clientHeight - 40; // padding
        
        if (this.scale === 'fit-width') {
            this.scale = containerWidth / viewport.width;
        } else if (this.scale === 'fit-page') {
            const scaleX = containerWidth / viewport.width;
            const scaleY = containerHeight / viewport.height;
            this.scale = Math.min(scaleX, scaleY);
        }
        
        // Ensure reasonable bounds
        this.scale = Math.min(Math.max(this.scale, 0.1), 5.0);
    }
    
    async nextPage() {
        if (!this.pdfDoc || this.currentPage >= this.totalPages || this.isAnimating) return;
        
        this.isAnimating = true;
        this.addPageTurnAnimation('next');
        
        setTimeout(async () => {
            this.currentPage++;
            if (this.isReadingMode) {
                await this.renderPageWithMobileZoom();
            } else {
                await this.renderPage();
            }
            this.updateNavigation();
            this.isAnimating = false;
            
            // Reset auto-hide timer in reading mode
            if (this.isReadingMode && this.controlsVisible) {
                this.resetHideTimer();
            }
        }, 300); // Half of animation duration
    }
    
    async previousPage() {
        if (!this.pdfDoc || this.currentPage <= 1 || this.isAnimating) return;
        
        this.isAnimating = true;
        this.addPageTurnAnimation('prev');
        
        setTimeout(async () => {
            this.currentPage--;
            if (this.isReadingMode) {
                await this.renderPageWithMobileZoom();
            } else {
                await this.renderPage();
            }
            this.updateNavigation();
            this.isAnimating = false;
            
            // Reset auto-hide timer in reading mode
            if (this.isReadingMode && this.controlsVisible) {
                this.resetHideTimer();
            }
        }, 300); // Half of animation duration
    }
    
    addPageTurnAnimation(direction) {
        const canvas = this.elements.canvas;
        const container = canvas.parentElement;
        const animationClass = direction === 'next' ? 'page-turning' : 'page-turning-reverse';
        
        // Add subtle haptic feedback on mobile
        if (navigator.vibrate) {
            navigator.vibrate([30, 10, 20]);
        }
        
        // Show page flip indicator
        this.showPageFlipFeedback(direction);
        
        // Create a temporary page overlay for more realistic effect
        const pageOverlay = document.createElement('div');
        pageOverlay.className = 'page-overlay';
        pageOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(to right, 
                rgba(255,255,255,0) 0%, 
                rgba(255,255,255,0.1) 50%, 
                rgba(255,255,255,0) 100%);
            pointer-events: none;
            z-index: 2;
            opacity: 0;
            transition: opacity 0.4s ease;
        `;
        
        container.appendChild(pageOverlay);
        
        canvas.classList.add(animationClass);
        
        // Show page overlay during animation
        setTimeout(() => {
            pageOverlay.style.opacity = '1';
        }, 200);
        
        setTimeout(() => {
            pageOverlay.style.opacity = '0';
        }, 600);
        
        setTimeout(() => {
            canvas.classList.remove(animationClass);
            if (container.contains(pageOverlay)) {
                container.removeChild(pageOverlay);
            }
        }, 800);
    }
    


    showPageFlipFeedback(direction) {
        // Show page number indicator
        const indicator = document.getElementById('pageFlipIndicator');
        if (indicator && this.pdfDoc) {
            indicator.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
            indicator.classList.add('show');
            setTimeout(() => indicator.classList.remove('show'), 2000);
        }
        
        // Create visual overlay with book-like shadow effect
        const overlay = document.createElement('div');
        overlay.className = 'page-flip-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: ${direction === 'next' ? 
                'linear-gradient(to right, transparent 30%, rgba(0,0,0,0.1) 50%, rgba(255,255,255,0.4) 70%, transparent 100%)' : 
                'linear-gradient(to left, transparent 30%, rgba(0,0,0,0.1) 50%, rgba(255,255,255,0.4) 70%, transparent 100%)'
            };
            pointer-events: none;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.4s ease;
        `;
        document.body.appendChild(overlay);
        
        // Animate overlay with book-like timing
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    if (document.body.contains(overlay)) {
                        document.body.removeChild(overlay);
                    }
                }, 400);
            }, 300);
        });
    }
    
    async goToPage(pageNumber) {
        if (!this.pdfDoc || pageNumber < 1 || pageNumber > this.totalPages || this.isAnimating) return;
        
        const direction = pageNumber > this.currentPage ? 'next' : 'prev';
        this.isAnimating = true;
        this.addPageTurnAnimation(direction);
        
        setTimeout(async () => {
            this.currentPage = pageNumber;
            await this.renderPage();
            this.isAnimating = false;
        }, 300);
    }
    
    zoomIn() {
        if (typeof this.scale === 'number' && this.scale < 3.0) {
            this.setZoom(this.scale * 1.2);
        }
    }
    
    zoomOut() {
        if (typeof this.scale === 'number' && this.scale > 0.5) {
            this.setZoom(this.scale / 1.2);
        }
    }
    
    setZoom(scale) {
        this.scale = Math.min(Math.max(scale, 0.1), 5.0);
        this.renderPage();
    }
    
    fitToWidth() {
        this.scale = 'fit-width';
        this.renderPage();
    }
    
    fitToPage() {
        this.scale = 'fit-page';
        this.renderPage();
    }
    
    updateNavigation() {
        this.elements.currentPageInput.value = this.currentPage;
        this.elements.prevPageBtn.disabled = this.currentPage <= 1;
        this.elements.nextPageBtn.disabled = this.currentPage >= this.totalPages;
        
        // Update mobile navigation
        if (this.elements.mobilePageTurn && this.pdfDoc) {
            this.elements.mobilePageTurn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
            this.elements.mobilePrevBtn.disabled = this.currentPage <= 1;
            this.elements.mobileNextBtn.disabled = this.currentPage >= this.totalPages;
            this.elements.mobilePageInfo.textContent = `${this.currentPage} / ${this.totalPages}`;
            
            // Update mobile zoom level display
            const zoomLevelEl = document.getElementById('mobileZoomLevel');
            if (zoomLevelEl) {
                zoomLevelEl.textContent = Math.round(this.mobileZoomLevel * 100) + '%';
            }
            
            // Update zoom button states
            const zoomInBtn = document.getElementById('mobileZoomIn');
            const zoomOutBtn = document.getElementById('mobileZoomOut');
            if (zoomInBtn) zoomInBtn.disabled = this.mobileZoomLevel >= this.maxZoom;
            if (zoomOutBtn) zoomOutBtn.disabled = this.mobileZoomLevel <= this.minZoom;
        }
        
        // Update page indicator in reading mode
        const indicator = document.getElementById('pageFlipIndicator');
        if (indicator && this.pdfDoc && this.isReadingMode) {
            indicator.textContent = `${this.currentPage} / ${this.totalPages}`;
            indicator.classList.add('show');
            setTimeout(() => indicator.classList.remove('show'), 2000);
        }
    }
    
    updateZoomLevel() {
        if (typeof this.scale === 'number') {
            this.elements.zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
        } else {
            this.elements.zoomLevel.textContent = this.scale === 'fit-width' ? 'Fit Width' : 'Fit Page';
        }
    }
    
    async loadTableOfContents() {
        try {
            const outline = await this.pdfDoc.getOutline();
            if (outline && outline.length > 0) {
                this.displayTableOfContents(outline);
            }
        } catch (error) {
            console.warn('No table of contents available');
        }
    }
    
    displayTableOfContents(outline, level = 0) {
        this.elements.tocList.innerHTML = '';
        
        outline.forEach(item => {
            const tocItem = document.createElement('div');
            tocItem.className = 'toc-item';
            tocItem.style.paddingLeft = `${level * 1.5}rem`;
            tocItem.textContent = item.title;
            
            if (item.dest) {
                tocItem.addEventListener('click', async () => {
                    try {
                        const dest = await this.pdfDoc.getDestination(item.dest);
                        if (dest) {
                            const pageRef = dest[0];
                            const pageIndex = await this.pdfDoc.getPageIndex(pageRef);
                            this.goToPage(pageIndex + 1);
                        }
                    } catch (error) {
                        console.warn('Could not navigate to outline item');
                    }
                });
            }
            
            this.elements.tocList.appendChild(tocItem);
            
            if (item.items && item.items.length > 0) {
                this.displayTableOfContents(item.items, level + 1);
            }
        });
    }
    
    enableControls() {
        this.elements.prevPageBtn.disabled = false;
        this.elements.nextPageBtn.disabled = false;
        this.elements.downloadBtn.disabled = false;
        this.elements.printBtn.disabled = false;
        
        this.updateNavigation();
    }
    
    downloadPDF() {
        if (this.elements.fileInput.files[0]) {
            const blob = new Blob([this.elements.fileInput.files[0]], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = this.elements.fileInput.files[0].name;
            link.click();
            URL.revokeObjectURL(url);
        }
    }
    
    printPDF() {
        if (this.pdfDoc) {
            window.print();
        }
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('Could not enter fullscreen:', err);
            });
            this.elements.fullscreenBtn.textContent = '🗗 Exit Fullscreen';
        } else {
            document.exitFullscreen();
            this.elements.fullscreenBtn.textContent = '⛶ Fullscreen';
        }
    }
    
    toggleSidebar() {
        this.elements.sidebar.classList.toggle('collapsed');
        const isCollapsed = this.elements.sidebar.classList.contains('collapsed');
        this.elements.sidebarToggle.textContent = isCollapsed ? '→' : '←';
        
        // Add/remove backdrop on mobile
        if (window.innerWidth <= 768) {
            if (isCollapsed) {
                this.removeMobileBackdrop();
            } else {
                this.addMobileBackdrop();
            }
        }
    }
    
    addMobileBackdrop() {
        let backdrop = document.getElementById('mobile-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'mobile-backdrop';
            backdrop.style.cssText = `
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 1999;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            backdrop.addEventListener('click', () => this.toggleSidebar());
            document.body.appendChild(backdrop);
        }
        requestAnimationFrame(() => backdrop.style.opacity = '1');
    }
    
    removeMobileBackdrop() {
        const backdrop = document.getElementById('mobile-backdrop');
        if (backdrop) {
            backdrop.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(backdrop)) {
                    document.body.removeChild(backdrop);
                }
            }, 300);
        }
    }
    
    setupTapZones() {
        const tapZoneTop = document.getElementById('tapZoneTop');
        const tapZoneLeft = document.getElementById('tapZoneLeft');
        const tapZoneRight = document.getElementById('tapZoneRight');
        
        if (tapZoneTop) {
            tapZoneTop.addEventListener('click', () => this.toggleControls());
        }
        
        if (tapZoneLeft) {
            tapZoneLeft.addEventListener('click', () => {
                if (this.isReadingMode) {
                    this.previousPage();
                }
            });
        }
        
        if (tapZoneRight) {
            tapZoneRight.addEventListener('click', () => {
                if (this.isReadingMode) {
                    this.nextPage();
                }
            });
        }
    }
    
    enterReadingMode() {
        if (window.innerWidth <= 768 && this.pdfDoc) {
            this.isReadingMode = true;
            document.body.classList.add('reading-mode');
            this.hideControls();
            this.fitPageToScreen();
        }
    }
    
    exitReadingMode() {
        this.isReadingMode = false;
        document.body.classList.remove('reading-mode');
        this.showControls();
        this.renderPage(); // Re-render with normal scaling
    }
    
    toggleControls() {
        if (this.isReadingMode) {
            if (this.controlsVisible) {
                this.hideControls();
            } else {
                this.showControls();
            }
        }
    }
    
    showControls() {
        if (this.isReadingMode) {
            this.controlsVisible = true;
            const header = document.querySelector('.header');
            const mobilePageTurn = document.getElementById('mobilePageTurn');
            
            if (header) header.classList.add('show-controls');
            if (mobilePageTurn) mobilePageTurn.classList.add('show-controls');
            
            // Auto-hide controls after 3 seconds
            this.resetHideTimer();
        }
    }
    
    hideControls() {
        if (this.isReadingMode) {
            this.controlsVisible = false;
            const header = document.querySelector('.header');
            const mobilePageTurn = document.getElementById('mobilePageTurn');
            
            if (header) header.classList.remove('show-controls');
            if (mobilePageTurn) mobilePageTurn.classList.remove('show-controls');
            
            if (this.hideControlsTimer) {
                clearTimeout(this.hideControlsTimer);
            }
        }
    }
    
    resetHideTimer() {
        if (this.hideControlsTimer) {
            clearTimeout(this.hideControlsTimer);
        }
        this.hideControlsTimer = setTimeout(() => this.hideControls(), 3000);
    }
    
    fitPageToScreen() {
        if (this.isReadingMode && this.pdfDoc) {
            // Use mobile zoom level for better text readability
            this.renderPageWithMobileZoom();
        }
    }
    
    async renderPageWithMobileZoom() {
        if (!this.pdfDoc || this.isLoading) return;
        
        try {
            const page = await this.pdfDoc.getPage(this.currentPage);
            
            // Calculate base scale to fit width, then apply mobile zoom
            const viewport = page.getViewport({ scale: 1.0 });
            const container = this.elements.viewerContainer;
            const containerWidth = container.clientWidth;
            const baseScale = containerWidth / viewport.width;
            const finalScale = baseScale * this.mobileZoomLevel;
            
            const scaledViewport = page.getViewport({ scale: finalScale });
            
            // Update canvas dimensions with high-DPI support
            const outputScale = this.devicePixelRatio;
            this.canvas.width = Math.floor(scaledViewport.width * outputScale);
            this.canvas.height = Math.floor(scaledViewport.height * outputScale);
            this.canvas.style.width = Math.floor(scaledViewport.width) + 'px';
            this.canvas.style.height = Math.floor(scaledViewport.height) + 'px';
            
            // Scale the drawing context for crisp rendering
            const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
            
            // Cancel any existing render task
            if (this.renderTask) {
                this.renderTask.cancel();
            }
            
            // Render page with high-DPI support
            this.renderTask = page.render({
                canvasContext: this.ctx,
                viewport: scaledViewport,
                transform: transform
            });
            
            await this.renderTask.promise;
            this.updateNavigation();
            
        } catch (error) {
            if (error.name !== 'RenderingCancelledException') {
                console.error('Error rendering page with mobile zoom:', error);
            }
        }
    }
    
    mobileZoomIn() {
        if (this.mobileZoomLevel < this.maxZoom) {
            this.mobileZoomLevel = Math.min(this.maxZoom, this.mobileZoomLevel + 0.25);
            if (this.isReadingMode) {
                this.renderPageWithMobileZoom();
            }
            this.updateNavigation();
            this.resetHideTimer();
        }
    }
    
    mobileZoomOut() {
        if (this.mobileZoomLevel > this.minZoom) {
            this.mobileZoomLevel = Math.max(this.minZoom, this.mobileZoomLevel - 0.25);
            if (this.isReadingMode) {
                this.renderPageWithMobileZoom();
            }
            this.updateNavigation();
            this.resetHideTimer();
        }
    }
    
    // Method to handle display changes that affect pixel ratio
    handleDisplayChange() {
        const newPixelRatio = window.devicePixelRatio || 1;
        if (Math.abs(newPixelRatio - this.devicePixelRatio) > 0.1) {
            this.devicePixelRatio = newPixelRatio;
            // Re-render current page with new pixel ratio
            if (this.pdfDoc) {
                if (this.isReadingMode) {
                    this.renderPageWithMobileZoom();
                } else {
                    this.renderPage();
                }
            }
        }
    }
    
    handleResize() {
        if (this.pdfDoc && (this.scale === 'fit-width' || this.scale === 'fit-page')) {
            this.renderPage();
        }
        
        // Update mobile button visibility
        if (this.pdfDoc && this.elements.mobilePageTurn) {
            this.elements.mobilePageTurn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
        }
        
        // Update device pixel ratio (for external monitor changes)
        this.devicePixelRatio = window.devicePixelRatio || 1;
        
        // Handle reading mode on resize
        if (window.innerWidth > 768 && this.isReadingMode) {
            this.exitReadingMode();
        } else if (window.innerWidth <= 768 && this.pdfDoc && !this.isReadingMode) {
            setTimeout(() => this.enterReadingMode(), 500);
        }
    }
    
    showLoading(show) {
        this.elements.loadingIndicator.style.display = show ? 'flex' : 'none';
    }
    
    updateStatus(message) {
        this.elements.statusText.textContent = message;
    }
    
    showError(message) {
        this.updateStatus(`Error: ${message}`);
        // You could add a toast notification here
        setTimeout(() => {
            this.updateStatus('Ready');
        }, 5000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PDFReaderApp();
});

// Add swipe hints for mobile users
function showSwipeHint() {
    const hint = document.createElement('div');
    hint.className = 'swipe-hint';
    hint.textContent = 'Swipe left/right to navigate pages';
    document.body.appendChild(hint);
    
    setTimeout(() => {
        hint.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        hint.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(hint);
        }, 300);
    }, 3000);
}

// Show swipe hint on first PDF load (mobile only)
let hintShown = false;
document.addEventListener('pdfLoaded', () => {
    if (!hintShown && window.innerWidth <= 768) {
        showSwipeHint();
        hintShown = true;
    }
});

// Service Worker Registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    });
}