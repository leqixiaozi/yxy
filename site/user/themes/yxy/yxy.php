<?php
namespace Grav\Theme;

use Grav\Common\Theme;
use RocketTheme\Toolbox\Event\Event;

class Yxy extends Theme
{
    private const MODULES = ['news' => 'news', 'products' => 'product', 'cases' => 'case'];

    public static function getSubscribedEvents()
    {
        return [
            'onPageInitialized' => ['onPageInitialized', 0],
            'onTwigSiteVariables' => ['onTwigSiteVariables', 0],
        ];
    }

    private function moduleFlags(): array
    {
        $flags = [];
        foreach (self::MODULES as $module => $template) {
            $flags[$module] = filter_var($this->config->get('themes.yxy.module_' . $module . '_enabled', false), FILTER_VALIDATE_BOOLEAN);
        }
        return $flags;
    }

    public function onTwigSiteVariables(): void
    {
        $this->grav['twig']->twig_vars['module_flags'] = $this->moduleFlags();
        $this->grav['twig']->twig_vars['module_sample_preview'] = $this->samplePreview();
    }

    private function samplePreview(): bool
    {
        return $this->grav['uri']->query('demo_preview') !== 'off'
            && filter_var($this->config->get('themes.yxy.module_sample_preview', false), FILTER_VALIDATE_BOOLEAN);
    }

    public function onPageInitialized(Event $event): void
    {
        if ($this->isAdmin()) {
            return;
        }
        $page = $event['page'];
        $flags = $this->moduleFlags();
        // Inspect the resolved page and its ancestors so aliases cannot bypass the switch.
        for ($node = $page; $node; $node = $node->parent()) {
            foreach (self::MODULES as $module => $template) {
                if ($node->route() === '/' . $module || $node->template() === $template) {
                    $isDemo = filter_var($page->header()->demo ?? false, FILTER_VALIDATE_BOOLEAN);
                    $isSample = filter_var($page->header()->preview_sample ?? false, FILTER_VALIDATE_BOOLEAN);
                    if (!$flags[$module] || ($isDemo && !($isSample && $this->samplePreview()))) {
                        // Let Grav's normal not-found processor render the 404 page.
                        $page->routable(false);
                    }
                    return;
                }
            }
        }
    }
}
