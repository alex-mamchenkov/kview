package kube

import (
	"bytes"
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"

	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"

	"kview/internal/cluster"
)

// StartPodPortForward starts a Kubernetes port-forward to a Pod and returns the
// effective local port and a stop function. If localPort is 0, a free local
// port is auto-selected by the Kubernetes API server and discovered from the
// portforwarder once it is ready.
func StartPodPortForward(
	ctx context.Context,
	c *cluster.Clients,
	namespace string,
	pod string,
	localHost string,
	localPort int,
	remotePort int,
) (int, func(), error) {
	if c == nil || c.RestConfig == nil {
		return 0, nil, fmt.Errorf("missing Kubernetes rest config")
	}
	if namespace == "" || pod == "" {
		return 0, nil, fmt.Errorf("namespace and pod are required")
	}
	if remotePort <= 0 {
		return 0, nil, fmt.Errorf("remote port must be > 0")
	}
	if localHost == "" {
		localHost = "127.0.0.1"
	}

	transport, upgrader, err := spdy.RoundTripperFor(c.RestConfig)
	if err != nil {
		return 0, nil, fmt.Errorf("spdy round tripper: %w", err)
	}

	hostIP := strings.TrimPrefix(c.RestConfig.Host, "https://")
	hostIP = strings.TrimPrefix(hostIP, "http://")

	serverURL := &url.URL{
		Scheme: "https",
		Host:   hostIP,
		Path:   fmt.Sprintf("/api/v1/namespaces/%s/pods/%s/portforward", namespace, pod),
	}

	dialer := spdy.NewDialer(upgrader, &http.Client{Transport: transport}, http.MethodPost, serverURL)

	outBuf := &bytes.Buffer{}
	errBuf := &bytes.Buffer{}

	stopChan := make(chan struct{}, 1)
	readyChan := make(chan struct{})

	portSpec := fmt.Sprintf("%d:%d", localPort, remotePort)
	if localPort == 0 {
		portSpec = fmt.Sprintf("0:%d", remotePort)
	}

	pf, err := portforward.New(dialer, []string{portSpec}, stopChan, readyChan, outBuf, errBuf)
	if err != nil {
		return 0, nil, fmt.Errorf("create portforward: %w", err)
	}

	go func() {
		// ForwardPorts blocks until stopChan is closed or an error occurs.
		_ = pf.ForwardPorts()
	}()

	select {
	case <-readyChan:
		// ready
	case <-ctx.Done():
		close(stopChan)
		return 0, nil, ctx.Err()
	}

	ports, err := pf.GetPorts()
	if err != nil {
		close(stopChan)
		return 0, nil, fmt.Errorf("get forwarded ports: %w", err)
	}
	if len(ports) == 0 {
		close(stopChan)
		return 0, nil, fmt.Errorf("no forwarded ports reported")
	}

	effectiveLocal := int(ports[0].Local)

	var once sync.Once
	stopFn := func() {
		once.Do(func() {
			close(stopChan)
		})
	}

	return effectiveLocal, stopFn, nil
}

// IsTCPPortAvailable reports whether host:port can be bound.
func IsTCPPortAvailable(host string, port int) bool {
	if port <= 0 {
		return false
	}
	if strings.TrimSpace(host) == "" {
		host = "127.0.0.1"
	}
	ln, err := net.Listen("tcp", fmt.Sprintf("%s:%d", host, port))
	if err != nil {
		return false
	}
	_ = ln.Close()
	return true
}
