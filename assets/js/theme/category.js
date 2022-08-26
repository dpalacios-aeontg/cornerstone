import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';
import { createApp } from 'vue';
import Pagination from 'v-pagination-3';

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
        console.log({context});
    }

    setLiveRegionAttributes($element, roleType, ariaLiveStatus) {
        $element.attr({
            role: roleType,
            'aria-live': ariaLiveStatus,
        });
    }

    makeShopByPriceFilterAccessible() {
        if (!$('[data-shop-by-price]').length) return;

        if ($('.navList-action').hasClass('is-active')) {
            $('a.navList-action.is-active').focus();
        }

        $('a.navList-action').on('click', () => this.setLiveRegionAttributes($('span.price-filter-message'), 'status', 'assertive'));
    }

    onReady() {
        this.arrangeFocusOnSortBy();

        $('[data-button-type="add-cart"]').on('click', (e) => this.setLiveRegionAttributes($(e.currentTarget).next(), 'status', 'polite'));

        this.makeShopByPriceFilterAccessible();

        compareProducts(this.context);

        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        $('a.reset-btn').on('click', () => this.setLiveRegionsAttributes($('span.reset-message'), 'status', 'polite'));

        this.ariaNotifyNoProducts();

        const self = this;
        createApp({
            data() {
                return {
                    category: self.context.category,
                    settingsDataTagEnabled: self.context.settingsDataTagEnabled,
                    page: 1,
                    filters: {
                        shopByPrice: {
                            high: 0,
                            low: 0,
                            enabled: false,
                        },
                        batteryCapacity: {
                            value: null,
                            enabled: false,
                        },
                    },
                };
            },
            methods: {
                myCallBack(pageValue) {
                    console.log({ pageValue });
                },
                filterCallback(event) {
                    console.log({ event });
                    console.log(JSON.stringify({ event }, null, 2));

                    // Filter By Price Range
                    if (event.shopByPriceRange !== null) {
                        this.filters.shopByPrice.enabled = true;
                        this.filters.shopByPrice.low = event.shopByPriceRange.low.value;
                        this.filters.shopByPrice.high = event.shopByPriceRange.high.value;
                    } else {
                        this.filters.shopByPrice.enabled = false;
                        this.filters.shopByPrice.high = 0;
                        this.filters.shopByPrice.low = 0;
                    }

                    if (event.batteryCapacity !== null) {
                        this.filters.batteryCapacity.enabled = true;
                        this.filters.batteryCapacity.value = event.batteryCapacity;
                    } else {
                        this.filters.batteryCapacity.enabled = false;
                        this.filters.batteryCapacity.value = event.batteryCapacity;
                    }

                    this.page = 1;
                },
            },
            computed: {
                totalProducts() {
                    return this.filteredProducts.length;
                },
                filteredProducts() {
                    let filteredProds = this.category.products;

                    if (this.filters.shopByPrice.enabled) {
                        console.log('this.filters.shopByPrice.enabled');
                        const { low, high } = this.filters.shopByPrice;
                        filteredProds = filteredProds.filter(product => {
                            const { value } = product.price?.without_tax || { value: 0 };
                            return value >= low && value <= high;
                        });
                    }

                    console.log({ 'filteredProds before battery capacity filtering': filteredProds });
                    if (this.filters.batteryCapacity.enabled) {
                        console.log('this.filters.batteryCapacity.enabled');
                        const { value } = this.filters.batteryCapacity;
                        filteredProds = filteredProds.filter(product => {
                            if (product.custom_fields !== null) {
                                const batteryCapacityCustomField = product.custom_fields.find(x => x.name.toLowerCase() === 'capacity');
                                const parsedValue = parseInt(batteryCapacityCustomField.value.split('Wh')[0], 10);
                                console.log({ parsedValue, value });
                                return parsedValue <= value;
                            }

                            return false;
                        });
                    }

                    return filteredProds;
                },
            },
            mounted() {},
        })
            .component('pagination', Pagination)
            .component('product-listing-container', {
                template: '#product-list-vue-template',
                props: ['page', 'filteredProductsFromParent'],
                data() {
                    return {
                        testTwo: null,
                        category: self.context.category,
                        settingsDataTagEnabled: self.context.settingsDataTagEnabled,
                        imageSizes: {
                            xss: '80w',
                            xs: '160w',
                            s: '320w',
                            m: '640w',
                            l: '960w',
                            xl: '1280w',
                            xll: '1920w',
                            default: '500x659',
                        },
                        headerElement: document.querySelector('header.header'),
                    };
                },
                watch: {
                    page(newVal, oldVal) {
                        if (newVal !== oldVal) {
                            const headerHeight = this.headerElement.offsetHeight;
                            window.scrollTo({ top: headerHeight, behavior: 'smooth' });
                        }
                    },
                },
                methods: {
                    getImageSrc(path, size) {
                        const selectedSize = this.imageSizes[size];
                        return path.replace('{:size}', selectedSize);
                    },
                    getImageDataSrcSet(path) {
                        const imageSrcSets = [];
                        Object.keys(this.imageSizes).forEach(size => {
                            imageSrcSets.push(`${this.getImageSrc(path, size)} ${size}`);
                        });
                        return imageSrcSets.join(',');
                    },
                },
                computed: {
                    currentProducts() {
                        if (this.filteredProducts.length === 0) {
                            return [];
                        }

                        return this.filteredProducts.slice((this.page - 1) * 12, this.page * 12);
                    },
                    filteredProducts() {
                        return this.$attrs.filteredproductsfromparent;
                    },
                },
                mounted() {
                    const productListingContainer = document.querySelector('#product-listing-container');
                    productListingContainer.parentElement.removeChild(productListingContainer);
                },
            }).component('sidebar', {
                template: '#sidebar-vue-template',
                props: ['category', 'filterCallback'],
                data() {
                    return {
                        shopByPriceRanges: self.context.shopByPriceRanges,
                        shopByPriceRange: null,
                        batteryCapacity: 0,
                    };
                },
                methods: {
                    applyFilters() {
                        this.$emit('filter', {
                            shopByPriceRange: this.selectedShopByPriceRange,
                            batteryCapacity: this.batteryCapacity,
                        });
                    },
                    resetFilters() {
                        this.shopByPriceRange = null;
                        this.batteryCapacity = this.batteryCapacityFilterRanges.max;

                        this.$emit('filter', {
                            shopByPriceRange: null,
                            batteryCapacity: this.batteryCapacityFilterRanges.max,
                        });
                    },
                },
                computed: {
                    selectedShopByPriceRange() {
                        if (this.shopByPriceRange !== null) {
                            return this.shopByPriceRanges[this.shopByPriceRange];
                        }

                        return null;
                    },
                    batteryCapacityFilterRanges() {
                        if (this.category.name.toLowerCase() === 'battery' && this.category.products.length > 0) {
                            const capacityCustomFieldsOne = this.category.products.filter(p => p.custom_fields !== null);
                            const capacityCustomFields = capacityCustomFieldsOne.map(x => x.custom_fields.find(y => y.name.toLowerCase() === 'capacity'));

                            if (capacityCustomFields.length > 0) {
                                const capacityValues = capacityCustomFields.map(x => parseInt(x.value.split('Wh')[0], 10));
                                return {
                                    min: Math.min(...capacityValues),
                                    max: Math.max(...capacityValues),
                                };
                            }
                        }

                        return { min: 0, max: 0 };
                    },
                },
                mounted() {
                    this.batteryCapacity = this.batteryCapacityFilterRanges.max;
                },
            }).mount('#product-listing-vue-container');
    }

    ariaNotifyNoProducts() {
        const $noProductsMessage = $('[data-no-products-notification]');
        if ($noProductsMessage.length) {
            $noProductsMessage.focus();
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }
}
