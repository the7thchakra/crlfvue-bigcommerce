import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
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

        this.setUpImageRollover();
        this.setUpAddAllToCart();
        this.setUpRemoveAllFromCart();

        this.makeShopByPriceFilterAccessible();

        compareProducts(this.context.urls);

        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        $('a.reset-btn').on('click', () => this.setLiveRegionsAttributes($('span.reset-message'), 'status', 'polite'));

        this.ariaNotifyNoProducts();
    }

    setUpImageRollover() {
        this.saveOriginalImage();
        $('figure').on('mouseenter', (e) => this.showAlternateImage(e));
        $('figure').on('mouseleave', (e) => this.showOriginalImage(e));
    }

    saveOriginalImage() {
        $('figure img[rollover_src]').each((i, img) => {
            var $img = $(img);
            $img
                .attr('data-original_srcset', $img.attr('data-srcset'))
                .attr('original_srcset', $img.attr('srcset'))
                .attr('original_src', $img.attr('src'))
                .attr('original_alt', $img.attr('alt'))
        });
    }

    showAlternateImage(e) {
        var $img = $(e.target).find('img[rollover_src]');
        $img
            .attr('data-srcset', '')
            .attr('srcset', '')
            .attr('src', $img.attr('rollover_src'))
            .attr('alt', $img.attr('rollover_alt'));
    }

    showOriginalImage(e) {
        var $img = $(e.target).find('img[rollover_src]');
        $img
            .attr('data-srcset', $img.attr('data-original_srcset'))
            .attr('srcset', $img.attr('original_srcset'))
            .attr('src', $img.attr('original_src'))
            .attr('alt', $img.attr('original_alt'));
    }

    setUpAddAllToCart() {
        var self = this;
        $('[data-button-type="add-all-to-cart"]').on('click', (e) => {
            var productIds = self.getAllProductIds();
            debugger;
            fetch('/api/storefront/carts/' + self.context.cartId, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(self.buildAddLineItemsRequest(productIds)),
            })
            .then(response => {
                alert($('[data-all-items-added]').text());
            })
        });
    }

    buildAddLineItemsRequest(productIds) {
        return {
            lineItems: productIds.map((productId) => {
                return {
                    productId: productId,
                    quantity: "1",
                };
            }),
        };
    }

    getAllProductIds() {
        var ids = [ ];
        var seen = { };
        $('[data-product-id]').each((index, element) => {
            var productId = $(element).attr('data-product-id');
            if (!seen[productId]) {
                ids.push(productId);
                seen[productId] = true;
            }
        });
        return ids;
    }

    setUpRemoveAllFromCart() {
        var self = this;
        $('[data-button-type="remove-all-from-cart"]').on('click', (e) => {
            fetch('/api/storefront/carts/' + self.context.cartId, {
                method: "DELETE",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                }
            })
            .then(response => {
                $('[data-button-type="remove-all-from-cart"]').parent().hide();
                
                alert($('[data-all-items-removed]').text());
            })
        });
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
