defmodule Pirates.GameServer.Supervisor do
    use Supervisor

    def start_link do
        Supervisor.start_link(__MODULE__, [])
    end

    def init([]) do
        children = [        
        worker(Pirates.GameServer.Instance, [:named]),
        worker(Pirates.GameServer.StateTicker, []),
        ]

        supervise(children, strategy: :rest_for_one)        
    end
end